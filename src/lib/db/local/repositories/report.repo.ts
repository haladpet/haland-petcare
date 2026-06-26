import { getLocalDb } from '@/lib/db/local/client'
import { customers, pets, appointments, invoices, payments } from '@/lib/db/local/schema'
import { eq, sql, count } from 'drizzle-orm'

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