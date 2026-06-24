import { withPermission } from '@/lib/permissions/middleware'
import { dischargePatient, calculateTotalCost } from '@/lib/db/local/repositories/hospitalization.repo'

const getHandler = withPermission('hospitalization')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  try {
    const { totalCost, breakdown } = await calculateTotalCost(id)
    return new Response(JSON.stringify({ data: { totalCost, breakdown } }), {
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

const postHandler = withPermission('hospitalization')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const body = await req.json()
  const { discharge_notes } = body

  if (!discharge_notes) {
    return new Response(
      JSON.stringify({ error: 'discharge_notes is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const result = await dischargePatient(id, discharge_notes)
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