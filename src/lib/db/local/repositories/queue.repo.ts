import { getLocalDb } from '@/lib/db/local/client'
import { queues } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq } from 'drizzle-orm'

interface QueueData {
  clinic_id?: string
  appointment_id?: string
  customer_id?: string
  pet_id?: string
  doctor_id?: string
  queue_number?: string
  priority?: string
  position?: number
  status?: string
}

export const createQueue = async (data: QueueData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(queues).values(record)
  writeToSyncQueue('queues', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_QUEUE', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateQueue = async (id: string, patch: QueueData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(queues).set(updated).where(eq(queues.id, id))
  writeToSyncQueue('queues', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_QUEUE', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(queues).where(eq(queues.id, id)).limit(1)
  return res[0] || null
}

export const findByClinic = async (clinicId: string) => {
  const db = getLocalDb()
  return db.select().from(queues).where(eq(queues.clinic_id, clinicId))
}