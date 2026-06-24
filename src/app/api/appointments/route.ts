import { withPermission } from '@/lib/permissions/middleware'
import { getLocalDb } from '@/lib/db/local/client'
import { appointments } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, desc, sql } from 'drizzle-orm'

const getHandler = withPermission('queue_management')(async function handler(req: Request) {
  const db = getLocalDb()
  const rows = await db
    .select()
    .from(appointments)
    .orderBy(desc(appointments.scheduled_at))
    .limit(50)

  return new Response(JSON.stringify({ data: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

const postHandler = withPermission('queue_management')(async function handler(req: Request) {
  const body = await req.json()
  const { clinic_id, customer_id, pet_id, doctor_id, scheduled_at, reason, notes } = body

  if (!clinic_id || !customer_id || !scheduled_at) {
    return new Response(
      JSON.stringify({ error: 'clinic_id, customer_id, and scheduled_at are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const db = getLocalDb()
  const id = uuidv4()
  const record = {
    id,
    clinic_id,
    customer_id,
    pet_id: pet_id || null,
    doctor_id: doctor_id || null,
    scheduled_at: new Date(scheduled_at),
    status: 'SCHEDULED',
    reason: reason || null,
    notes: notes || null,
    created_at: new Date(),
    updated_at: new Date(),
  }

  await db.insert(appointments).values(record)
  writeToSyncQueue('appointments', id, 'CREATE', record)
  writeAuditLog({
    action: 'CREATE_APPOINTMENT',
    user_id: null,
    clinic_id,
    status: 'INFO',
    details: { id },
  })

  return new Response(JSON.stringify({ data: record }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
})

export const GET = getHandler
export const POST = postHandler