import { withPermission } from '@/lib/permissions/middleware'
import {
  createMonitoringEntry,
  getMonitoringEntries,
} from '@/lib/db/local/repositories/hospitalization.repo'

const getHandler = withPermission('hospitalization')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const entries = await getMonitoringEntries(id)
  return new Response(JSON.stringify({ data: entries }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

const postHandler = withPermission('hospitalization')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const body = await req.json()
  const { vital_signs, notes } = body

  if (!vital_signs || typeof vital_signs !== 'object') {
    return new Response(
      JSON.stringify({ error: 'vital_signs object is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const entry = await createMonitoringEntry(id, vital_signs, notes)
  return new Response(JSON.stringify({ data: entry }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler
export const POST = postHandler