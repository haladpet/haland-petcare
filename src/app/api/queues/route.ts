import { withPermission } from '@/lib/permissions/middleware'
import { getQueueStatus, createQueue } from '@/lib/db/local/repositories/queue.repo'

const getHandler = withPermission('queue_management')(async function handler(req: Request, ctx: any) {
  const url = new URL(req.url)
  const clinicId = url.searchParams.get('clinicId')
  if (!clinicId) return new Response(JSON.stringify({ error: 'clinicId required' }), { status: 400 })
  const status = await getQueueStatus(clinicId)
  return new Response(JSON.stringify({ data: status }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

const postHandler = withPermission('queue_management')(async function handler(req: Request, ctx: any) {
  const body = await req.json()
  const { customer_id, pet_id, doctor_id, priority, clinic_id } = body
  if (!customer_id || !clinic_id) return new Response(JSON.stringify({ error: 'customer_id and clinic_id required' }), { status: 400 })
  const record = await createQueue({ customer_id, pet_id, doctor_id, priority, clinic_id })
  return new Response(JSON.stringify({ data: record }), { status: 201, headers: { 'Content-Type': 'application/json' } })
})

export const GET = getHandler
export const POST = postHandler
