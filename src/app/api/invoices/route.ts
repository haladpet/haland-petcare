import { withPermission } from '@/lib/permissions/middleware'
import {
  buildInvoiceFromMedicalRecord,
  findInvoicesByCustomer,
} from '@/lib/db/local/repositories/invoice.repo'

const getHandler = withPermission('pos_payment')(async function handler(req: Request) {
  const url = new URL(req.url)
  const customerId = url.searchParams.get('customer_id')

  if (customerId) {
    const invoices = await findInvoicesByCustomer(customerId)
    return new Response(JSON.stringify({ data: invoices }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'customer_id is required' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
})

const postHandler = withPermission('pos_payment')(async function handler(req: Request) {
  const body = await req.json()
  const { medical_record_id, tax_rate, discount } = body

  if (!medical_record_id) {
    return new Response(JSON.stringify({ error: 'medical_record_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await buildInvoiceFromMedicalRecord(medical_record_id, {
      taxRate: tax_rate,
      discount,
    })
    return new Response(JSON.stringify({ data: result }), {
      status: 201,
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