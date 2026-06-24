import { withPermission } from '@/lib/permissions/middleware'
import { detectConflict } from '@/lib/sync/conflict'

const CURRENT_SCHEMA_VERSION = 1

const postHandler = withPermission('settings')(async function handler(req: Request) {
  const body = await req.json()
  const { items } = body

  if (!items || !Array.isArray(items)) {
    return new Response(JSON.stringify({ error: 'items array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results: any[] = []

  for (const item of items) {
    // Check schema version
    if (item.schema_version !== CURRENT_SCHEMA_VERSION) {
      results.push({
        id: item.id,
        status: 'NEEDS_MIGRATION',
        currentVersion: CURRENT_SCHEMA_VERSION,
        itemVersion: item.schema_version,
      })
      continue
    }

    // Detect conflicts
    try {
      const conflictResult = await detectConflict(item)
      if (conflictResult.hasConflict) {
        results.push({
          id: item.id,
          status: 'CONFLICT',
          conflictId: conflictResult.conflictId,
        })
      } else {
        // No conflict — apply the change
        results.push({
          id: item.id,
          status: 'SYNCED',
        })
      }
    } catch (err: any) {
      results.push({
        id: item.id,
        status: 'ERROR',
        error: err.message,
      })
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const POST = postHandler