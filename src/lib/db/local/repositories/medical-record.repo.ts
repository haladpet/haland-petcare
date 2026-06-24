import { getLocalDb } from '@/lib/db/local/client'
import { medicalRecords } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, desc, and } from 'drizzle-orm'

export const createMedicalRecord = async (data: any) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = {
    id,
    clinic_id: data.clinic_id,
    customer_id: data.customer_id,
    pet_id: data.pet_id,
    visit_date: new Date(data.visit_date),
    diagnosis: data.diagnosis || null,
    treatment: data.treatment || null,
    notes: data.notes || null,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.insert(medicalRecords).values(record)

  // If linked to queue, update queue status
  if (data.queue_id) {
    try {
      await db.update((db as any).queues)
        .set({ status: 'COMPLETED', updated_at: new Date() })
        .where((db as any).queues.id.eq(data.queue_id))
    } catch (_) { /* ignore */ }
  }

  writeToSyncQueue('medical_records', id, 'CREATE', record)
  writeAuditLog({
    action: 'CREATE_MEDICAL_RECORD',
    user_id: null,
    clinic_id: data.clinic_id,
    status: 'INFO',
    details: { id, pet_id: data.pet_id },
  })
  return record
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id)).limit(1)
  return res[0] || null
}

export const findByPetId = async (petId: string, page: number = 1, limit: number = 20) => {
  const db = getLocalDb()
  const offset = (page - 1) * limit
  const res = await db.select()
    .from(medicalRecords)
    .where(eq(medicalRecords.pet_id, petId))
    .orderBy(desc(medicalRecords.visit_date))
    .limit(limit)
    .offset(offset)
  return res
}

export const countByPetId = async (petId: string) => {
  const db = getLocalDb()
  const res = await db.select({ count: (db as any).fn.count() })
    .from(medicalRecords)
    .where(eq(medicalRecords.pet_id, petId))
  return Number(res[0]?.count || 0)
}

export const updateMedicalRecord = async (id: string, patch: any) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  if (patch.visit_date) updated.visit_date = new Date(patch.visit_date)
  await db.update(medicalRecords).set(updated).where(eq(medicalRecords.id, id))
  writeToSyncQueue('medical_records', id, 'UPDATE', updated)
  writeAuditLog({
    action: 'UPDATE_MEDICAL_RECORD',
    user_id: null,
    clinic_id: patch.clinic_id || null,
    status: 'INFO',
    details: { id },
  })
  return { id, ...updated }
}