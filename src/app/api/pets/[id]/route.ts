import { withPermission } from '@/lib/permissions/middleware'
import { findById, updatePet, softDeletePet } from '@/lib/db/local/repositories/pet.repo'
import { UpdatePetSchema } from '@/lib/validation/pet'

const getHandler = withPermission('pet_view')(async function handler(req: Request, { params }: any) {
  const id = params.id
  const row = await findById(id)
  return new Response(JSON.stringify({ data: row }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

const patchHandler = withPermission('pet_update')(async function handler(req: Request, { params }: any) {
  const id = params.id
  const body = await req.json()
  const parsed = UpdatePetSchema.safeParse(body)
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })
  const updated = await updatePet(id, parsed.data)
  return new Response(JSON.stringify({ data: updated }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

const deleteHandler = withPermission('pet_delete')(async function handler(req: Request, { params }: any) {
  const id = params.id
  const deleted = await softDeletePet(id)
  return new Response(JSON.stringify({ data: deleted }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

export const GET = getHandler
export const PATCH = patchHandler
export const DELETE = deleteHandler
