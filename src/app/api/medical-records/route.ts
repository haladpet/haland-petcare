import { NextResponse } from 'next/server'
import { withPermission } from '@/lib/permissions/middleware'
import { createMedicalRecord, findByPetId, countByPetId } from '@/lib/db/local/repositories/medical-record.repo'
import { CreateMedicalRecordSchema } from '@/lib/validation/medical-record'

const getHandler = withPermission('medical_records')(async function handler(req: Request) {
  const url = new URL(req.url)
  const petId = url.searchParams.get('pet_id')
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '20')))

  if (!petId) {
    return new Response(JSON.stringify({ error: 'pet_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const [records, total] = await Promise.all([
    findByPetId(petId),
    countByPetId(petId),
  ])

  return new Response(
    JSON.stringify({
      data: records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})

const postHandler = withPermission('medical_records')(async function handler(req: Request) {
  const body = await req.json()
  const parsed = CreateMedicalRecordSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const data = {
    ...parsed.data,
    visit_date: parsed.data.visit_date ? new Date(parsed.data.visit_date) : undefined,
  }
  const record = await createMedicalRecord(data)
  return new Response(JSON.stringify({ data: record }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler
export const POST = postHandler