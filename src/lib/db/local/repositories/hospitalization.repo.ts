import { getLocalDb } from '@/lib/db/local/client'
import { hospitalizations, hospitalizationRateHistory, hospitalizationMonitoring } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq } from 'drizzle-orm'

interface HospitalizationData {
  clinic_id?: string
  customer_id?: string
  pet_id?: string
  cage_id?: string
  admission_date?: Date
  discharge_date?: Date
  status?: string
  notes?: string
}

interface RateHistoryData {
  hospitalization_id?: string
  daily_cost?: string
  effective_from?: Date
  effective_to?: Date
}

interface MonitoringData {
  hospitalization_id?: string
  monitored_at?: Date
  vital_signs?: unknown
  notes?: string
}

export const createHospitalization = async (data: HospitalizationData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(hospitalizations).values(record)
  writeToSyncQueue('hospitalizations', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_HOSPITALIZATION', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateHospitalization = async (id: string, patch: HospitalizationData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(hospitalizations).set(updated).where(eq(hospitalizations.id, id))
  writeToSyncQueue('hospitalizations', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_HOSPITALIZATION', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const dischargeHospitalization = async (id: string, dischargeDate: Date) => {
  const db = getLocalDb()
  const updated = { discharge_date: dischargeDate, status: 'DISCHARGED', updated_at: new Date() }
  await db.update(hospitalizations).set(updated).where(eq(hospitalizations.id, id))
  writeToSyncQueue('hospitalizations', id, 'UPDATE', updated)
  writeAuditLog({ action: 'DISCHARGE_HOSPITALIZATION', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(hospitalizations).where(eq(hospitalizations.id, id)).limit(1)
  return res[0] || null
}

export const findActiveByClinic = async (clinicId: string) => {
  const db = getLocalDb()
  return db.select().from(hospitalizations).where(eq(hospitalizations.clinic_id, clinicId))
}

export const addRateHistory = async (data: RateHistoryData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date() }
  await db.insert(hospitalizationRateHistory).values(record)
  return record
}

export const addMonitoring = async (data: MonitoringData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data }
  await db.insert(hospitalizationMonitoring).values(record)
  writeAuditLog({ action: 'ADD_MONITORING', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return record
}