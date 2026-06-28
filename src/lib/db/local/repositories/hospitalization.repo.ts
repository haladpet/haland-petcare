import { getLocalDb } from '@/lib/db/local/client'
import { hospitalizations, hospitalizationRateHistory, hospitalizationMonitoring } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, and, desc, sql, lte, gte } from 'drizzle-orm'

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
  await db.insert(hospitalizations).values(record as any)
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

// Alias for API route compatibility
export const dischargePatient = dischargeHospitalization

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(hospitalizations).where(eq(hospitalizations.id, id)).limit(1)
  return res[0] || null
}

// Alias for API route compatibility
export const findHospitalizationById = findById

export const findActiveByClinic = async (clinicId: string) => {
  const db = getLocalDb()
  return db.select().from(hospitalizations).where(eq(hospitalizations.clinic_id, clinicId))
}

// Alias for API route compatibility
export const findActiveHospitalizations = findActiveByClinic

export const findAll = async (clinicId: string, options?: { status?: string; limit?: number; offset?: number }) => {
  const db = getLocalDb()
  const limit = options?.limit || 50
  const offset = options?.offset || 0

  let query = db.select().from(hospitalizations).where(eq(hospitalizations.clinic_id, clinicId))

  if (options?.status) {
    query = query.where(eq(hospitalizations.status, options.status)) as typeof query
  }

  return query
    .orderBy(desc(hospitalizations.created_at))
    .limit(limit)
    .offset(offset)
}

export const admitPatient = async (data: { clinic_id: string; customer_id: string; pet_id: string; cage_id?: string; notes?: string }) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = {
    id,
    clinic_id: data.clinic_id,
    customer_id: data.customer_id,
    pet_id: data.pet_id,
    cage_id: data.cage_id || null,
    notes: data.notes || null,
    admission_date: new Date(),
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.insert(hospitalizations).values(record as any)
  writeToSyncQueue('hospitalizations', id, 'CREATE', record)
  writeAuditLog({ action: 'ADMIT_PATIENT', user_id: null, clinic_id: data.clinic_id, status: 'INFO', details: { id } })
  return record
}

export const calculateTotalCost = async (id: string) => {
  const db = getLocalDb()
  const [hospitalization] = await db.select().from(hospitalizations).where(eq(hospitalizations.id, id)).limit(1)
  if (!hospitalization) return 0

  const endDate = hospitalization.discharge_date || new Date()
  const startDate = hospitalization.admission_date || endDate
  const daysHospitalized = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

  // Get the most recent rate history
  const [rate] = await db
    .select()
    .from(hospitalizationRateHistory)
    .where(eq(hospitalizationRateHistory.hospitalization_id, id))
    .orderBy(desc(hospitalizationRateHistory.effective_from))
    .limit(1)

  const dailyCost = rate ? parseFloat(rate.daily_cost as string) || 0 : 0
  return dailyCost * daysHospitalized
}

export const createMonitoringEntry = async (data: { hospitalization_id: string; vital_signs?: unknown; notes?: string }) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = {
    id,
    hospitalization_id: data.hospitalization_id,
    vital_signs: data.vital_signs || null,
    notes: data.notes || null,
    monitored_at: new Date(),
  }
  await db.insert(hospitalizationMonitoring).values(record as any)
  writeAuditLog({ action: 'CREATE_MONITORING_ENTRY', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return record
}

export const addRateHistory = async (data: RateHistoryData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date() }
  await db.insert(hospitalizationRateHistory).values(record as any)
  return record
}

export const addMonitoring = async (data: MonitoringData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data }
  await db.insert(hospitalizationMonitoring).values(record as any)
  writeAuditLog({ action: 'ADD_MONITORING', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return record
}

export const getMonitoringEntries = async (hospitalizationId: string) => {
  const db = getLocalDb()
  return db
    .select()
    .from(hospitalizationMonitoring)
    .where(eq(hospitalizationMonitoring.hospitalization_id, hospitalizationId))
    .orderBy(desc(hospitalizationMonitoring.monitored_at))
}

export const updateDailyCost = async (id: string, dailyCost: string) => {
  const db = getLocalDb()
  const record = {
    id: uuidv4(),
    hospitalization_id: id,
    daily_cost: dailyCost,
    effective_from: new Date(),
    created_at: new Date(),
  }
  await db.insert(hospitalizationRateHistory).values(record as any)
  writeAuditLog({ action: 'UPDATE_DAILY_COST', user_id: null, clinic_id: null, status: 'INFO', details: { id, dailyCost } })
  return record
}
