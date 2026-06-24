import { withPermission } from '@/lib/permissions/middleware'
import { getNextInQueue, updateQueueStatus } from '@/lib/db/local/repositories/queue.repo'

const postHandler = withPermission('queue_management')(async function handler(req: Request, { params }: any) {
  const next = await getNextInQueue(params.id)
  if (!next) return new Response(JSON.stringify({ error: 'No queue available' }), { status: 404 })
  const updated = await updateQueueStatus(next.id, 'IN_PROGRESS')
  return new Response(JSON.stringify({ data: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

export const POST = postHandler
