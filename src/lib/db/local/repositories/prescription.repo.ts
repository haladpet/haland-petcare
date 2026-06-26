import { getLocalDb } from '@/lib/db/local/client'
import { prescriptions, prescriptionItems } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq } from 'drizzle-orm'

interface PrescriptionData {
  clinic_id?: string
  customer_id?: string
  pet_id?: string
  prescribed_by?: string
  status?: string
  notes?: string
}

interface PrescriptionItemData {
  prescription_id?: string
  medicine_id?: string
  dosage?: string
  quantity?: number
  instructions?: string
}

export const createPrescription = async (data: PrescriptionData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, date: new Date(), created_at: new Date(), updated_at: new Date() }
  await db.insert(prescriptions).values(record as any)
  writeToSyncQueue('prescriptions', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_PRESCRIPTION', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updatePrescription = async (id: string, patch: PrescriptionData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(prescriptions).set(updated as any).where(eq(prescriptions.id, id))
  writeToSyncQueue('prescriptions', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_PRESCRIPTION', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findPrescriptionById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1)
  return res[0] || null
}

export const findByPet = async (petId: string) => {
  const db = getLocalDb()
  return db.select().from(prescriptions).where(eq(prescriptions.pet_id, petId))
}

// Alias for API route compatibility
export const findPrescriptionsByPetId = findByPet

export const addPrescriptionItem = async (data: PrescriptionItemData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data }
  await db.insert(prescriptionItems).values(record as any)
  return record
}