import { withPermission } from '@/lib/permissions/middleware'
import { search as searchPets, createPet } from '@/lib/db/local/repositories/pet.repo'
import { CreatePetSchema } from '@/lib/validation/pet'

const getHandler = withPermission('queue_management')(async function handler(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''
  const page = Number(url.searchParams.get('page') || '1')
  const limit = Number(url.searchParams.get('limit') || '20')
  const res = await searchPets(q, page, limit)
  return new Response(JSON.stringify({ data: res }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

const postHandler = withPermission('pet_create')(async function handler(req: Request) {
  const body = await req.json()
  const parsed = CreatePetSchema.safeParse(body)
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })
  const data = {
    ...parsed.data,
    date_of_birth: parsed.data.date_of_birth ? new Date(parsed.data.date_of_birth) : undefined,
  }
  const record = await createPet(data)
  return new Response(JSON.stringify({ data: record }), { status: 201, headers: { 'Content-Type': 'application/json' } })
})

export const GET = getHandler
export const POST = postHandler