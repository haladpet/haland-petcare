import { withPermission } from '@/lib/permissions/middleware'
import { resolveConflict, getPendingConflicts } from '@/lib/sync/conflict'

const getHandler = withPermission('settings')(async function handler(req: Request) {
  const conflicts = await getPendingConflicts()
  return new Response(JSON.stringify({ data: conflicts }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

const postHandler = withPermission('settings')(async function handler(req: Request) {
  const body = await req.json()
  const { conflict_id, resolution, merged_data } = body

  if (!conflict_id || !resolution) {
    return new Response(
      JSON.stringify({ error: 'conflict_id and resolution are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!['LOCAL_WINS', 'SERVER_WINS', 'MERGE'].includes(resolution)) {
    return new Response(
      JSON.stringify({ error: 'resolution must be LOCAL_WINS, SERVER_WINS, or MERGE' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (resolution === 'MERGE' && !merged_data) {
    return new Response(
      JSON.stringify({ error: 'merged_data is required for MERGE resolution' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const result = await resolveConflict(conflict_id, resolution, merged_data)
    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

export const GET = getHandler
export const POST = postHandler