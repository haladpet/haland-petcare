import { getLocalDb } from '@/lib/db/local/client'
import { medicalRecords } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, sql } from 'drizzle-orm'

interface MedicalRecordData {
  clinic_id?: string
  customer_id?: string
  pet_id?: string
  visit_date?: Date
  diagnosis?: string
  treatment?: string
  notes?: string
}

export const createMedicalRecord = async (data: MedicalRecordData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(medicalRecords).values(record as any)
  writeToSyncQueue('medical_records', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_MEDICAL_RECORD', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateMedicalRecord = async (id: string, patch: MedicalRecordData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(medicalRecords).set(updated).where(eq(medicalRecords.id, id))
  writeToSyncQueue('medical_records', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_MEDICAL_RECORD', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(medicalRecords).where(eq(medicalRecords.id, id)).limit(1)
  return res[0] || null
}

export const findByPet = async (petId: string) => {
  const db = getLocalDb()
  return db.select().from(medicalRecords).where(eq(medicalRecords.pet_id, petId))
}

// Alias for API route compatibility
export const findByPetId = findByPet

export const countByPetId = async (petId: string) => {
  const db = getLocalDb()
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(medicalRecords)
    .where(eq(medicalRecords.pet_id, petId))
  return result?.count || 0
}