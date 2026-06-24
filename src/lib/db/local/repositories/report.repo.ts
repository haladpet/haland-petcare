import { getLocalDb } from '@/lib/db/local/client'
import {
  invoices,
  invoiceItems,
  payments,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  medicines,
  hospitalizations,
  cages,
  queues,
} from '@/lib/db/local/schema'
import { eq, gte, lte, and, sql, desc, asc } from 'drizzle-orm'

// ─── getRevenueReport ───────────────────────────────────────────
// GROUP BY date, JOIN invoices+payments, single query no N+1
export const getRevenueReport = async (
  clinicId: string,
  dateFrom: string,
  dateTo: string
) => {
  const db = getLocalDb()

  const rows = await db
    .select({
      date: sql<string>`DATE(${invoices.issued_at})`.mapWith(String),
      invoice_count: sql<number>`COUNT(DISTINCT ${invoices.id})::int`.mapWith(Number),
      total_invoiced: sql<number>`COALESCE(SUM(${invoices.total_amount}), 0)`.mapWith(Number),
      total_paid: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
    })
    .from(invoices)
    .leftJoin(payments, eq(invoices.id, payments.invoice_id))
    .where(
      and(
        eq(invoices.clinic_id, clinicId),
        gte(invoices.issued_at, new Date(dateFrom)),
        lte(invoices.issued_at, new Date(dateTo))
      )
    )
    .groupBy(sql`DATE(${invoices.issued_at})`)
    .orderBy(asc(sql`DATE(${invoices.issued_at})`))

  return rows
}

// ─── getVisitsByDoctor ──────────────────────────────────────────
export const getVisitsByDoctor = async (
  clinicId: string,
  dateFrom: string,
  dateTo: string
) => {
  const db = getLocalDb()

  const rows = await db
    .select({
      doctor_id: queues.doctor_id,
      visit_count: sql<number>`COUNT(*)::int`.mapWith(Number),
    })
    .from(queues)
    .where(
      and(
        eq(queues.clinic_id, clinicId),
        gte(queues.created_at, new Date(dateFrom)),
        lte(queues.created_at, new Date(dateTo))
      )
    )
    .groupBy(queues.doctor_id)
    .orderBy(desc(sql`COUNT(*)`))

  return rows
}

// ─── getMostPrescribedMedicines ─────────────────────────────────
export const getMostPrescribedMedicines = async (
  clinicId: string,
  dateFrom: string,
  dateTo: string,
  limit: number = 10
) => {
  const db = getLocalDb()

  const rows = await db
    .select({
      medicine_id: prescriptionItems.medicine_id,
      medicine_name: medicines.name,
      total_quantity: sql<number>`COALESCE(SUM(${prescriptionItems.quantity}), 0)::int`.mapWith(Number),
      prescription_count: sql<number>`COUNT(DISTINCT ${prescriptionItems.prescription_id})::int`.mapWith(Number),
    })
    .from(prescriptionItems)
    .innerJoin(prescriptions, eq(prescriptionItems.prescription_id, prescriptions.id))
    .innerJoin(medicines, eq(prescriptionItems.medicine_id, medicines.id))
    .where(
      and(
        eq(prescriptions.clinic_id, clinicId),
        gte(prescriptions.date, new Date(dateFrom)),
        lte(prescriptions.date, new Date(dateTo))
      )
    )
    .groupBy(prescriptionItems.medicine_id, medicines.name)
    .orderBy(desc(sql`COALESCE(SUM(${prescriptionItems.quantity}), 0)`))
    .limit(limit)

  return rows
}

// ─── getCageOccupancyRate ───────────────────────────────────────
export const getCageOccupancyRate = async (clinicId: string) => {
  const db = getLocalDb()

  const totalCages = await db
    .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
    .from(cages)
    .where(eq(cages.clinic_id, clinicId))

  const occupiedCages = await db
    .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
    .from(cages)
    .where(
      and(
        eq(cages.clinic_id, clinicId),
        eq(cages.status, 'OCCUPIED')
      )
    )

  const total = totalCages[0]?.count || 0
  const occupied = occupiedCages[0]?.count || 0
  const rate = total > 0 ? Math.round((occupied / total) * 100) : 0

  return {
    totalCages: total,
    occupiedCages: occupied,
    availableCages: total - occupied,
    occupancyRate: rate,
  }
}

// ─── getDailyVisitCount ─────────────────────────────────────────
export const getDailyVisitCount = async (
  clinicId: string,
  dateFrom: string,
  dateTo: string
) => {
  const db = getLocalDb()

  const rows = await db
    .select({
      date: sql<string>`DATE(${medicalRecords.visit_date})`.mapWith(String),
      count: sql<number>`COUNT(*)::int`.mapWith(Number),
    })
    .from(medicalRecords)
    .where(
      and(
        eq(medicalRecords.clinic_id, clinicId),
        gte(medicalRecords.visit_date, new Date(dateFrom)),
        lte(medicalRecords.visit_date, new Date(dateTo))
      )
    )
    .groupBy(sql`DATE(${medicalRecords.visit_date})`)
    .orderBy(asc(sql`DATE(${medicalRecords.visit_date})`))

  return rows
}

// ─── getSummaryStats ────────────────────────────────────────────
export const getSummaryStats = async (clinicId: string) => {
  const db = getLocalDb()

  const [totalCustomers] = await db
    .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
    .from(db['customers'] as any)
    .where(eq((db as any).customers.clinic_id, clinicId))

  const [totalPets] = await db
    .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
    .from(db['pets'] as any)
    .where(eq((db as any).pets.clinic_id, clinicId))

  const [activeHospitalizations] = await db
    .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
    .from(hospitalizations)
    .where(
      and(
        eq(hospitalizations.clinic_id, clinicId),
        eq(hospitalizations.status, 'ADMITTED')
      )
    )

  const [pendingInvoices] = await db
    .select({
      count: sql<number>`COUNT(*)::int`.mapWith(Number),
      total: sql<number>`COALESCE(SUM(${invoices.total_amount}), 0)`.mapWith(Number),
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.clinic_id, clinicId),
        sql`${invoices.status} IN ('PENDING', 'PARTIAL', 'DRAFT')`
      )
    )

  return {
    totalCustomers: totalCustomers?.count || 0,
    totalPets: totalPets?.count || 0,
    activeHospitalizations: activeHospitalizations?.count || 0,
    pendingInvoicesCount: pendingInvoices?.count || 0,
    pendingInvoicesTotal: pendingInvoices?.total || 0,
  }
}