import { withPermission, type AuthenticatedRequest } from '@/lib/permissions/middleware'
import { getServerDb } from '@/lib/db/server/client'
import { conflictQueue, syncQueue } from '@/lib/db/server/schema'
import { eq, and } from 'drizzle-orm'
import { requireClinicScope } from '@/lib/security/tenant-guard'
import { writeAuditLog } from '@/lib/db/server/audit'

/**
 * Conflict Resolution API
 * 
 * POST /api/sync/resolve
 * Body: { conflictId, resolution: 'LOCAL_WINS' | 'SERVER_WINS' | 'MERGE', mergedData? }
 * 
 * Only OWNER role can resolve conflicts.
 */

const postHandler = withPermission('settings')(async function handler(
  req: AuthenticatedRequest
) {
  const { userId, clinicId, role } = req.auth
  requireClinicScope(clinicId, 'sync:resolve')

  // Only OWNER can resolve conflicts
  if (role !== 'OWNER') {
    return new Response(
      JSON.stringify({ error: 'Forbidden', message: 'Only clinic owner can resolve conflicts' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const body = await req.json()
  const { conflictId, resolution, mergedData } = body

  if (!conflictId || !resolution) {
    return new Response(
      JSON.stringify({ error: 'conflictId and resolution are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!['LOCAL_WINS', 'SERVER_WINS', 'MERGE'].includes(resolution)) {
    return new Response(
      JSON.stringify({ error: 'resolution must be LOCAL_WINS, SERVER_WINS, or MERGE' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (resolution === 'MERGE' && !mergedData) {
    return new Response(
      JSON.stringify({ error: 'mergedData is required for MERGE resolution' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const db = getServerDb()

  try {
    return await db.transaction(async (tx: any) => {
      // Fetch the conflict
      const [conflict] = await tx
        .select()
        .from(conflictQueue)
        .where(eq(conflictQueue.id, conflictId))
        .limit(1)

      if (!conflict) {
        return new Response(
          JSON.stringify({ error: 'Conflict not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (conflict.resolved) {
        return new Response(
          JSON.stringify({ error: 'Conflict already resolved' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const conflictData = conflict.conflict_data as any
      const entity = conflict.entity
      const entityId = conflict.entity_id

      // Apply resolution
      let finalData: any

      switch (resolution) {
        case 'LOCAL_WINS':
          finalData = conflictData.client_data
          break
        case 'SERVER_WINS':
          finalData = conflictData.server_data
          break
        case 'MERGE':
          finalData = mergedData
          break
      }

      // Mark conflict as resolved
      await tx
        .update(conflictQueue)
        .set({
          resolved: true,
          conflict_data: {
            ...conflictData,
            resolution,
            resolved_by: userId,
            resolved_at: new Date().toISOString(),
            final_data: finalData,
          },
          updated_at: new Date(),
        })
        .where(eq(conflictQueue.id, conflictId))

      // Mark related sync queue items as resolved
      await tx
        .update(syncQueue)
        .set({ status: 'RESOLVED', updated_at: new Date() })
        .where(
          and(
            eq(syncQueue.entity, entity),
            eq(syncQueue.entity_id, entityId),
            eq(syncQueue.status, 'CONFLICT')
          )
        )

      // Audit the resolution
      await writeAuditLog({
        action: `conflict:resolve:${entity}`,
        user_id: userId,
        clinic_id: clinicId,
        entity: entity,
        entity_id: entityId,
        changes: {
          resolution,
          client_data: conflictData.client_data,
          server_data: conflictData.server_data,
          final_data: finalData,
        },
        status: 'SUCCESS',
      })

      return new Response(
        JSON.stringify({
          success: true,
          conflictId,
          resolution,
          entity,
          entityId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to resolve conflict', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// GET — list pending conflicts for the clinic
const getHandler = withPermission('settings')(async function handler(
  req: AuthenticatedRequest
) {
  const { clinicId } = req.auth
  requireClinicScope(clinicId, 'sync:resolve:list')

  const db = getServerDb()

  const conflicts = await db
    .select()
    .from(conflictQueue)
    .where(eq(conflictQueue.resolved, false))
    .orderBy(db._.conflictQueue.created_at as any)

  return new Response(
    JSON.stringify({ conflicts }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

export const POST = postHandler
export const GET = getHandler