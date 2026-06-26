import { getLocalDb } from '@/lib/db/local/client'
import { customers, pets, appointments, invoices, payments, queues, cages, hospitalizations, medicalRecords, prescriptionItems, medicines, serverUsers } from '@/lib/db/local/schema'
import { eq, sql, and, gte, lte, desc, count } from 'drizzle-orm'

export const getDashboardStats = async (clinicId: string) => {
  const db = getLocalDb()

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(customers)
    .where(eq(customers.clinic_id, clinicId))

  const [petCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(pets)
    .where(eq(pets.clinic_id, clinicId))

  const [appointmentCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(appointments)
    .where(eq(appointments.clinic_id, clinicId))

  const [invoiceCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(invoices)
    .where(eq(invoices.clinic_id, clinicId))

  const [revenueResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amount})::numeric, 0)`.mapWith(Number) })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoice_id, invoices.id))
    .where(eq(invoices.clinic_id, clinicId))

  return {
    totalCustomers: customerCount?.count || 0,
    totalPets: petCount?.count || 0,
    totalAppointments: appointmentCount?.count || 0,
    totalInvoices: invoiceCount?.count || 0,
    totalRevenue: revenueResult?.total || 0,
  }
}

export const getSummaryStats = getDashboardStats

export const getRevenueReport = async (clinicId: string, startDate: Date, endDate: Date) => {
  const db = getLocalDb()
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount})::numeric, 0)`.mapWith(Number),
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoice_id, invoices.id))
    .where(
      and(
        eq(invoices.clinic_id, clinicId),
        gte(payments.paid_at, startDate),
        lte(payments.paid_at, endDate)
      )
    )

  return {
    totalRevenue: result[0]?.total || 0,
    transactionCount: result[0]?.count || 0,
  }
}

export const getVisitsByDoctor = async (clinicId: string, startDate: Date, endDate: Date) => {
  const db = getLocalDb()
  return db
    .select({
      doctorId: appointments.doctor_id,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinic_id, clinicId),
        gte(appointments.scheduled_at, startDate),
        lte(appointments.scheduled_at, endDate)
      )
    )
    .groupBy(appointments.doctor_id)
}

export const getMostPrescribedMedicines = async (clinicId: string, limit: number = 10) => {
  const db = getLocalDb()
  return db
    .select({
      medicineId: prescriptionItems.medicine_id,
      medicineName: medicines.name,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(prescriptionItems)
    .innerJoin(medicines, eq(prescriptionItems.medicine_id, medicines.id))
    .where(eq(medicines.clinic_id, clinicId))
    .groupBy(prescriptionItems.medicine_id, medicines.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit)
}

export const getCageOccupancyRate = async (clinicId: string) => {
  const db = getLocalDb()
  const [totalCages] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(cages)
    .where(eq(cages.clinic_id, clinicId))

  const [occupiedCages] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(cages)
    .where(and(eq(cages.clinic_id, clinicId), eq(cages.status, 'OCCUPIED')))

  const total = totalCages?.count || 0
  const occupied = occupiedCages?.count || 0

  return {
    total,
    occupied,
    available: total - occupied,
    occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
  }
}

export const getDailyVisitCount = async (clinicId: string, startDate: Date, endDate: Date) => {
  const db = getLocalDb()
  return db
    .select({
      date: sql<string>`DATE(${appointments.scheduled_at})`,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinic_id, clinicId),
        gte(appointments.scheduled_at, startDate),
        lte(appointments.scheduled_at, endDate)
      )
    )
    .groupBy(sql`DATE(${appointments.scheduled_at})`)
    .orderBy(sql`DATE(${appointments.scheduled_at})`)
}