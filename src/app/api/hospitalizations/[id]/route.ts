import { withPermission } from '@/lib/permissions/middleware'
import { findHospitalizationById } from '@/lib/db/local/repositories/hospitalization.repo'

const getHandler = withPermission('hospitalization')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const hosp = await findHospitalizationById(id)
  if (!hosp) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ data: hosp }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler