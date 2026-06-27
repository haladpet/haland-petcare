import { getServerDb } from "@/lib/db/server/client";
import {
  customers,
  pets,
  appointments,
  invoices,
  payments,
  queues,
  cages,
  hospitalizations,
  medicalRecords,
  prescriptionItems,
  medicines,
} from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";

export const getDashboardStats = async (clinicId: string) => {
  const db = getServerDb();

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(customers)
    .where(withClinicFilter(customers, clinicId));

  const [petCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(pets)
    .where(withClinicFilter(pets, clinicId));

  const [appointmentCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(appointments)
    .where(withClinicFilter(appointments, clinicId));

  const [invoiceCount] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(invoices)
    .where(withClinicFilter(invoices, clinicId));

  const [revenueResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount})::numeric, 0)`.mapWith(Number),
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoice_id, invoices.id))
    .where(withClinicFilter(invoices, clinicId));

  return {
    totalCustomers: customerCount?.count || 0,
    totalPets: petCount?.count || 0,
    totalAppointments: appointmentCount?.count || 0,
    totalInvoices: invoiceCount?.count || 0,
    totalRevenue: revenueResult?.total || 0,
  };
};

export const getSummaryStats = getDashboardStats;

export const getRevenueReport = async (clinicId: string, startDate: Date, endDate: Date) => {
  const db = getServerDb();
  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount})::numeric, 0)`.mapWith(Number),
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoice_id, invoices.id))
    .where(
      and(
        withClinicFilter(invoices, clinicId),
        gte(payments.paid_at, startDate),
        lte(payments.paid_at, endDate)
      )
    );

  return {
    totalRevenue: result[0]?.total || 0,
    transactionCount: result[0]?.count || 0,
  };
};

export const getVisitsByDoctor = async (clinicId: string, startDate: Date, endDate: Date) => {
  const db = getServerDb();
  return db
    .select({
      doctorId: appointments.doctor_id,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(appointments)
    .where(
      and(
        withClinicFilter(appointments, clinicId),
        gte(appointments.scheduled_at, startDate),
        lte(appointments.scheduled_at, endDate)
      )
    )
    .groupBy(appointments.doctor_id);
};

export const getMostPrescribedMedicines = async (clinicId: string, limit: number = 10) => {
  const db = getServerDb();
  return db
    .select({
      medicineId: prescriptionItems.medicine_id,
      medicineName: medicines.name,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(prescriptionItems)
    .innerJoin(medicines, eq(prescriptionItems.medicine_id, medicines.id))
    .where(withClinicFilter(medicines, clinicId))
    .groupBy(prescriptionItems.medicine_id, medicines.name)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
};

export const getCageOccupancyRate = async (clinicId: string) => {
  const db = getServerDb();
  const [totalCages] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(cages)
    .where(withClinicFilter(cages, clinicId));

  const [occupiedCages] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(cages)
    .where(
      withClinicAndFilter(cages, clinicId, eq(cages.status, "OCCUPIED"))
    );

  const total = totalCages?.count || 0;
  const occupied = occupiedCages?.count || 0;

  return {
    total,
    occupied,
    available: total - occupied,
    occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
  };
};

export const getDailyVisitCount = async (clinicId: string, startDate: Date, endDate: Date) => {
  const db = getServerDb();
  return db
    .select({
      date: sql<string>`DATE(${appointments.scheduled_at})`,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(appointments)
    .where(
      and(
        withClinicFilter(appointments, clinicId),
        gte(appointments.scheduled_at, startDate),
        lte(appointments.scheduled_at, endDate)
      )
    )
    .groupBy(sql`DATE(${appointments.scheduled_at})`)
    .orderBy(sql`DATE(${appointments.scheduled_at})`);
};