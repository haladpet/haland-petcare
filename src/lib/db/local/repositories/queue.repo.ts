import { getLocalDb } from '@/lib/db/local/client'
import { queues } from '@/lib/db/local/schema'
import { generateQueueNumber } from '@/lib/utils/queue-number'
import { v4 as uuidv4 } from 'uuid'
import { writeAuditLog } from '@/lib/db/server/audit'

export const createQueue = async (data: { customer_id: string; pet_id?: string; doctor_id?: string; priority?: 'NORMAL' | 'HIGH' | 'EMERGENCY'; clinic_id: string }) => {
  const db = getLocalDb()
  const id = uuidv4()
  const queue_number = await generateQueueNumber(data.clinic_id)
  const record = { id, clinic_id: data.clinic_id, appointment_id: null, position: 0, status: 'WAITING', priority: data.priority || 'NORMAL', customer_id: data.customer_id, pet_id: data.pet_id || null, doctor_id: data.doctor_id || null, queue_number, created_at: new Date(), updated_at: new Date() }
  await db.insert((db as any).queues).values(record)
  writeAuditLog({ action: 'CREATE_QUEUE', user_id: null, clinic_id: data.clinic_id, status: 'INFO', details: { id } })
  return record
}

export const getNextInQueue = async (doctorId?: string) => {
  const db = getLocalDb()
  // EMERGENCY > HIGH > FIFO among same priority
  const rows = await db.select().from((db as any).queues).where((db as any).queues.status.eq('WAITING')).orderBy((db as any).queues.priority.desc(), (db as any).queues.created_at.asc()).limit(1)
  return rows[0] || null
}

export const updateQueueStatus = async (queueId: string, newStatus: string) => {
  const db = getLocalDb()
  const updates: any = { status: newStatus, updated_at: new Date() }
  if (newStatus === 'IN_PROGRESS') updates.actual_start_time = new Date()
  await db.update((db as any).queues).set(updates).where((db as any).queues.id.eq(queueId))
  writeAuditLog({ action: 'UPDATE_QUEUE_STATUS', user_id: null, clinic_id: null, status: 'INFO', details: { queueId, newStatus } })
  return { id: queueId, ...updates }
}

export const getQueueStatus = async (clinicId: string) => {
  const db = getLocalDb()
  const currentServing = await db.select().from((db as any).queues).where((db as any).queues.clinic_id.eq(clinicId).and((db as any).queues.status.eq('IN_PROGRESS')))
  const waiting = await db.select().from((db as any).queues).where((db as any).queues.clinic_id.eq(clinicId).and((db as any).queues.status.eq('WAITING')))
  return { currentServing, waiting }
}
