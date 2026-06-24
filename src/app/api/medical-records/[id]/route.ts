import { withPermission } from '@/lib/permissions/middleware'
import { findById, updateMedicalRecord } from '@/lib/db/local/repositories/medical-record.repo'
import { UpdateMedicalRecordSchema } from '@/lib/validation/medical-record'

const getHandler = withPermission('medical_records')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const record = await findById(id)
  if (!record) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response(JSON.stringify({ data: record }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

const patchHandler = withPermission('medical_records')(async function handler(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const body = await req.json()
  const parsed = UpdateMedicalRecordSchema.safeParse({ ...body, id })
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const updated = await updateMedicalRecord(id, parsed.data)
  return new Response(JSON.stringify({ data: updated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler
export const PATCH = patchHandler