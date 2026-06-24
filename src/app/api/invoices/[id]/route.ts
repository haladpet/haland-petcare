import { withPermission } from '@/lib/permissions/middleware'
import { findInvoiceById, updateInvoiceStatus } from '@/lib/db/local/repositories/invoice.repo'

const getHandler = withPermission('pos_payment')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const invoice = await findInvoiceById(id)
  if (!invoice) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ data: invoice }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

const patchHandler = withPermission('pos_payment')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const body = await req.json()
  const { status } = body

  if (!status || !['DRAFT', 'PENDING', 'PAID', 'PARTIAL', 'CANCELLED'].includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const updated = await updateInvoiceStatus(id, status)
  return new Response(JSON.stringify({ data: updated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler
export const PATCH = patchHandler