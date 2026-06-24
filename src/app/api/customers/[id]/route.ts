import { withPermission } from '@/lib/permissions/middleware'
import { findById, updateCustomer, softDeleteCustomer } from '@/lib/db/local/repositories/customer.repo'
import { UpdateCustomerSchema } from '@/lib/validation/customer'

const getHandler = withPermission('customer_view')(async function handler(req: Request, { params }: any) {
  const id = params.id
  const row = await findById(id)
  return new Response(JSON.stringify({ data: row }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

const patchHandler = withPermission('customer_update')(async function handler(req: Request, { params }: any) {
  const id = params.id
  const body = await req.json()
  const parsed = UpdateCustomerSchema.safeParse(body)
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })
  const updated = await updateCustomer(id, parsed.data)
  return new Response(JSON.stringify({ data: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

const deleteHandler = withPermission('customer_delete')(async function handler(req: Request, { params }: any) {
  const id = params.id
  const deleted = await softDeleteCustomer(id)
  return new Response(JSON.stringify({ data: deleted }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

export const GET = getHandler
export const PATCH = patchHandler
export const DELETE = deleteHandler
