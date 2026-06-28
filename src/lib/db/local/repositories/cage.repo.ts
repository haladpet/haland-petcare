import { getLocalDb } from '@/lib/db/local/client'
import { cages } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq } from 'drizzle-orm'

interface CageData {
  clinic_id?: string
  code?: string
  description?: string
  type?: string
  status?: string
}

export const createCage = async (data: CageData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(cages).values(record as any)
  writeToSyncQueue('cages', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_CAGE', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateCage = async (id: string, patch: CageData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(cages).set(updated).where(eq(cages.id, id))
  writeToSyncQueue('cages', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_CAGE', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findCageById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(cages).where(eq(cages.id, id)).limit(1)
  return res[0] || null
}

export const findByClinic = async (clinicId: string) => {
  const db = getLocalDb()
  return db.select().from(cages).where(eq(cages.clinic_id, clinicId))
}

export const findAll = async () => {
  const db = getLocalDb()
  return db.select().from(cages)
}