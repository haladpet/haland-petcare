import { getLocalDb } from '@/lib/db/local/client'
import {
  hospitalizations,
  hospitalizationRateHistory,
  hospitalizationMonitoring,
  cages,
  invoices,
  invoiceItems,
} from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, isNull, and, sql } from 'drizzle-orm'

// ─── admitPatient ───────────────────────────────────────────────
export const admitPatient = async (
  medicalRecordId: string,
  petId: string,
  cageId: string,
  initialDailyCost: number,
  reason: string,
  clinicId: string,
  customerId: string
) => {
  const db = getLocalDb()
  const hospitalizationId = uuidv4()
  const now = new Date()

  // Verify cage is available
  const cage = await db.select().from(cages).where(eq(cages.id, cageId)).limit(1)
  if (!cage[0]) throw new Error('Cage not found')
  if (cage[0].status !== 'AVAILABLE') throw new Error('Cage is not available')

  // Transaction: insert hospitalization, rate history, update cage
  const hospRecord = {
    id: hospitalizationId,
    clinic_id: clinicId,
    customer_id: customerId,
    pet_id: petId,
    cage_id: cageId,
    admission_date: now,
    discharge_date: null,
    status: 'ADMITTED',
    notes: reason,
    created_at: now,
    updated_at: now,
  }
  await db.insert(hospitalizations).values(hospRecord)

  // Insert first rate history entry
  const rateEntryId = uuidv4()
  const rateRecord = {
    id: rateEntryId,
    hospitalization_id: hospitalizationId,
    daily_cost: String(initialDailyCost),
    effective_from: now,
    effective_to: null,
    created_at: now,
  }
  await db.insert(hospitalizationRateHistory).values(rateRecord)

  // Update cage to OCCUPIED
  await db.update(cages)
    .set({ status: 'OCCUPIED', updated_at: now })
    .where(eq(cages.id, cageId))

  writeToSyncQueue('hospitalizations', hospitalizationId, 'CREATE', {
    hospitalization: hospRecord,
    rate_history: [rateRecord],
  })
  writeAuditLog({
    action: 'ADMIT_PATIENT',
    user_id: null,
    clinic_id: clinicId,
    status: 'INFO',
    details: { hospitalizationId, petId, cageId, initialDailyCost },
  })

  return {
    hospitalization: hospRecord,
    rateEntry: rateRecord,
  }
}

// ─── updateDailyCost ────────────────────────────────────────────
export const updateDailyCost = async (hospitalizationId: string, newDailyCost: number) => {
  const db = getLocalDb()
  const now = new Date()

  // Find the current active rate entry (effective_to is null)
  const currentRate = await db
    .select()
    .from(hospitalizationRateHistory)
    .where(
      and(
        eq(hospitalizationRateHistory.hospitalization_id, hospitalizationId),
        isNull(hospitalizationRateHistory.effective_to)
      )
    )
    .limit(1)

  if (!currentRate[0]) throw new Error('No active rate entry found for this hospitalization')

  // Close the current rate entry
  await db
    .update(hospitalizationRateHistory)
    .set({ effective_to: now })
    .where(eq(hospitalizationRateHistory.id, currentRate[0].id))

  // Insert new rate entry
  const newRateId = uuidv4()
  const newRateRecord = {
    id: newRateId,
    hospitalization_id: hospitalizationId,
    daily_cost: String(newDailyCost),
    effective_from: now,
    effective_to: null,
    created_at: now,
  }
  await db.insert(hospitalizationRateHistory).values(newRateRecord)

  writeToSyncQueue('hospitalization_rate_history', newRateId, 'CREATE', newRateRecord)
  writeToSyncQueue('hospitalization_rate_history', currentRate[0].id, 'UPDATE', {
    effective_to: now,
  })
  writeAuditLog({
    action: 'UPDATE_DAILY_COST',
    user_id: null,
    clinic_id: null,
    status: 'INFO',
    details: {
      hospitalizationId,
      oldCost: currentRate[0].daily_cost,
      newCost: newDailyCost,
      changedAt: now,
    },
  })

  return {
    previousRate: currentRate[0],
    newRate: newRateRecord,
  }
}

// ─── calculateTotalCost ─────────────────────────────────────────
// Returns total cost AND breakdown per period
export const calculateTotalCost = async (hospitalizationId: string) => {
  const db = getLocalDb()
  const now = new Date()

  const rateEntries = await db
    .select()
    .from(hospitalizationRateHistory)
    .where(eq(hospitalizationRateHistory.hospitalization_id, hospitalizationId))
    .orderBy(hospitalizationRateHistory.effective_from)

  if (rateEntries.length === 0) {
    return { totalCost: 0, breakdown: [] }
  }

  const breakdown: {
    dailyCost: number
    effectiveFrom: Date
    effectiveTo: Date
    days: number
    subtotal: number
  }[] = []

  let totalCost = 0

  for (const entry of rateEntries) {
    const from = new Date(entry.effective_from)
    const to = entry.effective_to ? new Date(entry.effective_to) : now
    const msDiff = to.getTime() - from.getTime()
    // Ceiling: round up to full days (a partial day counts as 1 full day)
    const daysFloat = msDiff / (1000 * 60 * 60 * 24)
    const days = Math.ceil(Math.max(daysFloat, 1)) // minimum 1 day
    const dailyCost = Number(entry.daily_cost)
    const subtotal = days * dailyCost

    breakdown.push({
      dailyCost,
      effectiveFrom: from,
      effectiveTo: to,
      days,
      subtotal,
    })
    totalCost += subtotal
  }

  return { totalCost, breakdown }
}

// ─── dischargePatient ───────────────────────────────────────────
export const dischargePatient = async (
  hospitalizationId: string,
  dischargeNotes: string
) => {
  const db = getLocalDb()
  const now = new Date()

  // Get hospitalization
  const hosp = await db
    .select()
    .from(hospitalizations)
    .where(eq(hospitalizations.id, hospitalizationId))
    .limit(1)

  if (!hosp[0]) throw new Error('Hospitalization not found')
  if (hosp[0].status === 'DISCHARGED') throw new Error('Patient already discharged')

  // Calculate total cost with breakdown
  const { totalCost, breakdown } = await calculateTotalCost(hospitalizationId)

  // Update hospitalization record
  await db
    .update(hospitalizations)
    .set({
      actual_discharge_date: now,
      status: 'DISCHARGED',
      notes: hosp[0].notes
        ? `${hosp[0].notes}\n--- Discharge Notes ---\n${dischargeNotes}`
        : dischargeNotes,
      updated_at: now,
    })
    .where(eq(hospitalizations.id, hospitalizationId))

  // Release cage
  if (hosp[0].cage_id) {
    await db
      .update(cages)
      .set({ status: 'AVAILABLE', updated_at: now })
      .where(eq(cages.id, hosp[0].cage_id))
  }

  // Create invoice
  const invoiceId = uuidv4()
  const invoiceRecord = {
    id: invoiceId,
    clinic_id: hosp[0].clinic_id,
    customer_id: hosp[0].customer_id,
    appointment_id: null,
    total_amount: String(totalCost),
    status: 'PENDING',
    issued_at: now,
    due_date: null,
    created_at: now,
    updated_at: now,
  }
  await db.insert(invoices).values(invoiceRecord)

  // Create invoice items — breakdown PER PERIOD
  const createdItems = []
  for (let i = 0; i < breakdown.length; i++) {
    const period = breakdown[i]
    const itemId = uuidv4()
    const fromStr = period.effectiveFrom.toISOString().split('T')[0]
    const toStr = period.effectiveTo.toISOString().split('T')[0]
    const description = `Hospitalization Day ${fromStr} - ${toStr} @ Rp ${period.dailyCost.toLocaleString('id-ID')}/day (${period.days} day${period.days > 1 ? 's' : ''})`

    const itemRecord = {
      id: itemId,
      invoice_id: invoiceId,
      description,
      quantity: period.days,
      unit_price: String(period.dailyCost),
      total_price: String(period.subtotal),
    }
    await db.insert(invoiceItems).values(itemRecord)
    createdItems.push(itemRecord)
  }

  // Sync queue entries
  writeToSyncQueue('hospitalizations', hospitalizationId, 'UPDATE', {
    actual_discharge_date: now,
    status: 'DISCHARGED',
  })
  writeToSyncQueue('invoices', invoiceId, 'CREATE', {
    invoice: invoiceRecord,
    items: createdItems,
  })
  if (hosp[0].cage_id) {
    writeToSyncQueue('cages', hosp[0].cage_id, 'UPDATE', { status: 'AVAILABLE' })
  }

  writeAuditLog({
    action: 'DISCHARGE_PATIENT',
    user_id: null,
    clinic_id: hosp[0].clinic_id,
    status: 'INFO',
    details: {
      hospitalizationId,
      totalCost,
      breakdown,
      invoiceId,
    },
  })

  return {
    hospitalization: { ...hosp[0], status: 'DISCHARGED', actual_discharge_date: now },
    invoice: invoiceRecord,
    invoiceItems: createdItems,
    totalCost,
    breakdown,
  }
}

// ─── createMonitoringEntry ──────────────────────────────────────
export const createMonitoringEntry = async (
  hospitalizationId: string,
  vitalSigns: Record<string, any>,
  notes?: string
) => {
  const db = getLocalDb()
  const id = uuidv4()
  const now = new Date()

  const record = {
    id,
    hospitalization_id: hospitalizationId,
    monitored_at: now,
    vital_signs: vitalSigns,
    notes: notes || null,
  }
  await db.insert(hospitalizationMonitoring).values(record)

  // Update hospitalization updated_at
  await db
    .update(hospitalizations)
    .set({ updated_at: now })
    .where(eq(hospitalizations.id, hospitalizationId))

  writeToSyncQueue('hospitalization_monitoring', id, 'CREATE', record)
  writeAuditLog({
    action: 'CREATE_MONITORING_ENTRY',
    user_id: null,
    clinic_id: null,
    status: 'INFO',
    details: { hospitalizationId, monitoringId: id },
  })

  return record
}

// ─── getMonitoringEntries ───────────────────────────────────────
export const getMonitoringEntries = async (hospitalizationId: string) => {
  const db = getLocalDb()
  return db
    .select()
    .from(hospitalizationMonitoring)
    .where(eq(hospitalizationMonitoring.hospitalization_id, hospitalizationId))
    .orderBy(sql`${hospitalizationMonitoring.monitored_at} DESC`)
}

// ─── findHospitalizationById ────────────────────────────────────
export const findHospitalizationById = async (id: string) => {
  const db = getLocalDb()
  const res = await db
    .select()
    .from(hospitalizations)
    .where(eq(hospitalizations.id, id))
    .limit(1)
  if (!res[0]) return null

  // Get rate history
  const rates = await db
    .select()
    .from(hospitalizationRateHistory)
    .where(eq(hospitalizationRateHistory.hospitalization_id, id))
    .orderBy(hospitalizationRateHistory.effective_from)

  // Get monitoring entries
  const monitoring = await getMonitoringEntries(id)

  return { ...res[0], rateHistory: rates, monitoring }
}

// ─── findActiveHospitalizations ─────────────────────────────────
export const findActiveHospitalizations = async (clinicId?: string) => {
  const db = getLocalDb()
  let query = db
    .select()
    .from(hospitalizations)
    .where(eq(hospitalizations.status, 'ADMITTED'))

  if (clinicId) {
    query = query.where(eq(hospitalizations.clinic_id, clinicId))
  }

  return query.orderBy(sql`${hospitalizations.admission_date} DESC`)
}