import { withPermission } from '@/lib/permissions/middleware'
import { updateQueueStatus } from '@/lib/db/local/repositories/queue.repo'

const patchHandler = withPermission('queue_management')(async function handler(req: Request, { params }: any) {
  const body = await req.json()
  const { status } = body
  if (!status) return new Response(JSON.stringify({ error: 'status required' }), { status: 400 })
  const updated = await updateQueueStatus(params.id, status)
  return new Response(JSON.stringify({ data: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

export const PATCH = patchHandler
