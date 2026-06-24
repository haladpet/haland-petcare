import { withPermission, type AuthenticatedRequest } from '@/lib/permissions/middleware'
import { getServerDb } from '@/lib/db/server/client'
import { serverSchema, syncQueue, conflictQueue, syncLogs } from '@/lib/db/server/schema'
import { eq, and, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { requireClinicScope } from '@/lib/security/tenant-guard'
import { writeAuditLog } from '@/lib/db/server/audit'

const CURRENT_SCHEMA_VERSION = 1

// ─── Entity Table Mapping ────────────────────────────────────────
// Maps entity names to their corresponding Drizzle table definitions
const entityTableMap: Record<string, any> = {
  customers: serverSchema.customers,
  pets: serverSchema.pets,
  appointments: serverSchema.appointments,
  queues: serverSchema.queues,
  medical_records: serverSchema.medicalRecords,
  prescriptions: serverSchema.prescriptions,
  prescription_items: serverSchema.prescriptionItems,
  medicines: serverSchema.medicines,
  cages: serverSchema.cages,
  hospitalizations: serverSchema.hospitalizations,
  hospitalization_rate_history: serverSchema.hospitalizationRateHistory,
  hospitalization_monitoring: serverSchema.hospitalizationMonitoring,
  inventory_items: serverSchema.inventoryItems,
  inventory_batches: serverSchema.inventoryBatches,
  inventory_transactions: serverSchema.inventoryTransactions,
  invoices: serverSchema.invoices,
  invoice_items: serverSchema.invoiceItems,
  payments: serverSchema.payments,
}

// ─── Sync Item Interface ─────────────────────────────────────────
interface SyncItem {
  id: string
  entity: string
  entity_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  payload: any
  schema_version: number
  client_version?: number
}

interface SyncResult {
  id: string
  status: 'SYNCED' | 'CONFLICT' | 'NEEDS_MIGRATION' | 'ERROR'
  conflictId?: string
  error?: string
  currentVersion?: number
  itemVersion?: number
}

// ─── POST Handler ────────────────────────────────────────────────
const postHandler = withPermission('queue_management')(async function handler(
  req: AuthenticatedRequest
) {
  const { userId, clinicId, role, deviceId } = req.auth
  requireClinicScope(clinicId, 'sync:POST')

  const body = await req.json()
  const { items } = body as { items: SyncItem[] }

  if (!items || !Array.isArray(items)) {
    return new Response(
      JSON.stringify({ error: 'items array is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const db = getServerDb()
  const results: SyncResult[] = []

  // Process each item in a transaction for atomicity
  // Each item gets its own transaction to prevent one failure from blocking others
  for (const item of items) {
    try {
      // Check schema version compatibility
      if (item.schema_version !== CURRENT_SCHEMA_VERSION) {
        results.push({
          id: item.id,
          status: 'NEEDS_MIGRATION',
          currentVersion: CURRENT_SCHEMA_VERSION,
          itemVersion: item.schema_version,
        })
        continue
      }

      // Validate entity exists in our table map
      const table = entityTableMap[item.entity]
      if (!table) {
        results.push({
          id: item.id,
          status: 'ERROR',
          error: `Unknown entity: ${item.entity}`,
        })
        continue
      }

      // Parse payload
      const payload =
        typeof item.payload === 'string'
          ? JSON.parse(item.payload)
          : item.payload

      // Apply the change within a transaction
      const result = await applyChangeInTransaction(
        db,
        table,
        item,
        payload,
        clinicId,
        userId
      )

      results.push(result)
    } catch (err: any) {
      results.push({
        id: item.id,
        status: 'ERROR',
        error: err.message || 'Unknown error',
      })
    }
  }

  // Log sync summary
  const synced = results.filter((r) => r.status === 'SYNCED').length
  const conflicts = results.filter((r) => r.status === 'CONFLICT').length
  const errors = results.filter((r) => r.status === 'ERROR').length

  await writeAuditLog({
    action: 'sync:batch',
    user_id: userId,
    clinic_id: clinicId,
    resource: `sync:${items.length} items`,
    status: errors > 0 ? 'PARTIAL' : 'SUCCESS',
    metadata: { synced, conflicts, errors, total: items.length },
  })

  return new Response(
    JSON.stringify({
      results,
      summary: { synced, conflicts, errors, total: items.length },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

// ─── Apply Change in Transaction ─────────────────────────────────
async function applyChangeInTransaction(
  db: ReturnType<typeof getServerDb>,
  table: any,
  item: SyncItem,
  payload: any,
  clinicId: string,
  userId: string
): Promise<SyncResult> {
  // Use a database transaction for atomicity
  return db.transaction(async (tx: any) => {
    try {
      switch (item.action) {
        case 'CREATE':
          return await handleCreate(tx, table, item, payload, clinicId, userId)

        case 'UPDATE':
          return await handleUpdate(tx, table, item, payload, clinicId, userId)

        case 'DELETE':
          return await handleDelete(tx, table, item, payload, clinicId, userId)

        default:
          return {
            id: item.id,
            status: 'ERROR',
            error: `Unknown action: ${item.action}`,
          }
      }
    } catch (err: any) {
      // Transaction will be rolled back automatically
      throw err
    }
  })
}

// ─── Handle CREATE ───────────────────────────────────────────────
async function handleCreate(
  tx: any,
  table: any,
  item: SyncItem,
  payload: any,
  clinicId: string,
  userId: string
): Promise<SyncResult> {
  // Ensure clinic_id is set on the payload
  const data = {
    ...payload,
    clinic_id: clinicId,
    id: item.entity_id,
    created_at: new Date(),
    updated_at: new Date(),
  }

  // Check if record already exists (idempotency)
  const [existing] = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, item.entity_id), eq(table.clinic_id, clinicId)))
    .limit(1)

  if (existing) {
    // Record already exists — treat as no-op (idempotent)
    return { id: item.id, status: 'SYNCED' }
  }

  // Insert the record
  await tx.insert(table).values(data)

  // Audit the creation
  await writeAuditLog({
    action: `sync:create:${item.entity}`,
    user_id: userId,
    clinic_id: clinicId,
    entity: item.entity,
    entity_id: item.entity_id,
    changes: { created: data },
    status: 'SUCCESS',
  })

  return { id: item.id, status: 'SYNCED' }
}

// ─── Handle UPDATE ───────────────────────────────────────────────
async function handleUpdate(
  tx: any,
  table: any,
  item: SyncItem,
  payload: any,
  clinicId: string,
  userId: string
): Promise<SyncResult> {
  // Fetch current server record
  const [serverRecord] = await tx
    .select()
    .from(table)
    .where(and(eq(table.id, item.entity_id), eq(table.clinic_id, clinicId)))
    .limit(1)

  if (!serverRecord) {
    // Record doesn't exist on server — treat as CREATE
    return await handleCreate(tx, table, item, payload, clinicId, userId)
  }

  // Check for version-based conflict detection
  const serverVersion = serverRecord.version
  const clientVersion = item.client_version || payload.version

  if (serverVersion != null && clientVersion != null && serverVersion !== clientVersion) {
    // Version mismatch — potential conflict
    // Check if there's already a conflict entry
    const [existingConflict] = await tx
      .select({ id: conflictQueue.id })
      .from(conflictQueue)
      .where(
        and(
          eq(conflictQueue.entity, item.entity),
          eq(conflictQueue.entity_id, item.entity_id),
          eq(conflictQueue.resolved, false)
        )
      )
      .limit(1)

    if (existingConflict) {
      return {
        id: item.id,
        status: 'CONFLICT',
        conflictId: existingConflict.id,
      }
    }

    // Create new conflict entry
    const conflictId = uuidv4()
    await tx.insert(conflictQueue).values({
      id: conflictId,
      entity: item.entity,
      entity_id: item.entity_id,
      conflict_data: {
        client_data: payload,
        client_version: clientVersion,
        server_data: serverRecord,
        server_version: serverVersion,
        action: item.action,
        detected_at: new Date().toISOString(),
      },
      schema_version: item.schema_version,
      resolved: false,
      created_at: new Date(),
      updated_at: new Date(),
    })

    await writeAuditLog({
      action: `sync:conflict:${item.entity}`,
      user_id: userId,
      clinic_id: clinicId,
      entity: item.entity,
      entity_id: item.entity_id,
      changes: {
        client_version: clientVersion,
        server_version: serverVersion,
      },
      status: 'CONFLICT',
    })

    return {
      id: item.id,
      status: 'CONFLICT',
      conflictId,
    }
  }

  // No conflict — apply the update
  const updateData = {
    ...payload,
    version: (serverVersion || 0) + 1,
    updated_at: new Date(),
  }

  // Remove fields that shouldn't be updated
  delete updateData.id
  delete updateData.clinic_id
  delete updateData.created_at

  await tx
    .update(table)
    .set(updateData)
    .where(and(eq(table.id, item.entity_id), eq(table.clinic_id, clinicId)))

  await writeAuditLog({
    action: `sync:update:${item.entity}`,
    user_id: userId,
    clinic_id: clinicId,
    entity: item.entity,
    entity_id: item.entity_id,
    changes: { before: serverRecord, after: updateData },
    status: 'SUCCESS',
  })

  return { id: item.id, status: 'SYNCED' }
}

// ─── Handle DELETE ───────────────────────────────────────────────
async function handleDelete(
  tx: any,
  table: any,
  item: SyncItem,
  payload: any,
  clinicId: string,
  userId: string
): Promise<SyncResult> {
  // Soft delete — set deleted_at timestamp
  const [serverRecord] = await tx
    .select()
    .from(table)
    .where(and(eq(table.id, item.entity_id), eq(table.clinic_id, clinicId)))
    .limit(1)

  if (!serverRecord) {
    // Record doesn't exist — no-op (idempotent)
    return { id: item.id, status: 'SYNCED' }
  }

  // Check if table supports soft delete (has deleted_at column)
  if ('deleted_at' in table) {
    await tx
      .update(table)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(and(eq(table.id, item.entity_id), eq(table.clinic_id, clinicId)))
  } else {
    // Hard delete for tables without soft delete support
    await tx
      .delete(table)
      .where(and(eq(table.id, item.entity_id), eq(table.clinic_id, clinicId)))
  }

  await writeAuditLog({
    action: `sync:delete:${item.entity}`,
    user_id: userId,
    clinic_id: clinicId,
    entity: item.entity,
    entity_id: item.entity_id,
    changes: { deleted: serverRecord },
    status: 'SUCCESS',
  })

  return { id: item.id, status: 'SYNCED' }
}

// ─── GET Handler — Pull changes from server ──────────────────────
const getHandler = withPermission('queue_management')(async function handler(
  req: AuthenticatedRequest
) {
  const { clinicId } = req.auth
  requireClinicScope(clinicId, 'sync:GET')

  const url = new URL(req.url)
  const lastSyncedAt = url.searchParams.get('last_synced_at')
  const entity = url.searchParams.get('entity')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)

  const db = getServerDb()
  const changes: any[] = []

  // If entity is specified, only pull changes for that entity
  const entities = entity ? [entity] : Object.keys(entityTableMap)

  for (const entityName of entities) {
    const table = entityTableMap[entityName]
    if (!table) continue

    try {
      let query = db
        .select()
        .from(table)
        .where(eq(table.clinic_id, clinicId))

      // Delta sync: only get changes since last_synced_at
      if (lastSyncedAt) {
        query = query.where(
          sql`${table.updated_at} > ${new Date(lastSyncedAt).toISOString()}`
        )
      }

      const rows = await query.limit(limit)

      for (const row of rows) {
        changes.push({
          entity: entityName,
          entity_id: (row as any).id,
          action: (row as any).deleted_at ? 'DELETE' : 'UPDATE',
          payload: row,
          server_version: (row as any).version || 1,
        })
      }
    } catch (err: any) {
      console.error(`Error pulling changes for ${entityName}:`, err.message)
    }
  }

  return new Response(
    JSON.stringify({
      changes,
      server_time: new Date().toISOString(),
      schema_version: CURRENT_SCHEMA_VERSION,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

export const POST = postHandler
export const GET = getHandler