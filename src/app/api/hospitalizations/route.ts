import { withPermission } from '@/lib/permissions/middleware'
import {
  admitPatient,
  findActiveHospitalizations,
} from '@/lib/db/local/repositories/hospitalization.repo'

const getHandler = withPermission('hospitalization')(async function handler(req: Request) {
  const url = new URL(req.url)
  const clinicId = url.searchParams.get('clinic_id') || undefined

  const hospitalizations = await findActiveHospitalizations(clinicId)
  return new Response(JSON.stringify({ data: hospitalizations }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

const postHandler = withPermission('hospitalization')(async function handler(req: Request) {
  const body = await req.json()
  const {
    medical_record_id,
    pet_id,
    cage_id,
    initial_daily_cost,
    reason,
    clinic_id,
    customer_id,
  } = body

  if (!pet_id || !cage_id || !initial_daily_cost || !reason || !clinic_id || !customer_id) {
    return new Response(
      JSON.stringify({
        error:
          'pet_id, cage_id, initial_daily_cost, reason, clinic_id, and customer_id are required',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const result = await admitPatient(
      medical_record_id || null,
      pet_id,
      cage_id,
      Number(initial_daily_cost),
      reason,
      clinic_id,
      customer_id
    )
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