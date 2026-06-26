import { getLocalDb } from '@/lib/db/local/client'
import { queues } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, asc, sql } from 'drizzle-orm'

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

export const getNextInQueue = async (clinicId: string) => {
  const db = getLocalDb()
  const [next] = await db
    .select()
    .from(queues)
    .where(eq(queues.clinic_id, clinicId))
    .where(eq(queues.status, 'WAITING'))
    .orderBy(asc(queues.position))
    .limit(1)
  return next || null
}

export const updateQueueStatus = async (id: string, status: string) => {
  const db = getLocalDb()
  const updated = { status, updated_at: new Date() }
  await db.update(queues).set(updated).where(eq(queues.id, id))
  writeToSyncQueue('queues', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_QUEUE_STATUS', user_id: null, clinic_id: null, status: 'INFO', details: { id, status } })
  return { id, ...updated }
}

export const getQueueStatus = async (clinicId: string) => {
  const db = getLocalDb()
  const [waiting] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(queues)
    .where(eq(queues.clinic_id, clinicId))
    .where(eq(queues.status, 'WAITING'))

  const [inProgress] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(queues)
    .where(eq(queues.clinic_id, clinicId))
    .where(eq(queues.status, 'IN_PROGRESS'))

  const [completed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(queues)
    .where(eq(queues.clinic_id, clinicId))
    .where(eq(queues.status, 'COMPLETED'))

  return {
    waiting: waiting?.count || 0,
    inProgress: inProgress?.count || 0,
    completed: completed?.count || 0,
    total: (waiting?.count || 0) + (inProgress?.count || 0) + (completed?.count || 0),
  }
}