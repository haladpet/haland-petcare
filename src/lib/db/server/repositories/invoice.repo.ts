import { getServerDb } from "@/lib/db/server/client";
import { invoices, invoiceItems, medicalRecords } from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface InvoiceData {
  customer_id?: string;
  appointment_id?: string;
  total_amount?: string;
  status?: string;
  due_date?: Date;
}

interface InvoiceItemData {
  invoice_id?: string;
  description?: string;
  quantity?: number;
  unit_price?: string;
  total_price?: string;
}

export const createInvoice = async (clinicId: string, data: InvoiceData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    customer_id: data.customer_id || "",
    appointment_id: data.appointment_id || null,
    total_amount: data.total_amount || "0",
    status: data.status || "PENDING",
    issued_at: new Date(),
    due_date: data.due_date || null,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(invoices).values(record);
  return record;
};

export const updateInvoice = async (clinicId: string, id: string, patch: InvoiceData) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(invoices)
    .set(updated)
    .where(withClinicAndFilter(invoices, clinicId, eq(invoices.id, id)));
  return { id, ...updated };
};

export const updateInvoiceStatus = async (clinicId: string, id: string, status: string) => {
  const db = getServerDb();
  const updated = { status, updated_at: new Date() };
  await db
    .update(invoices)
    .set(updated)
    .where(withClinicAndFilter(invoices, clinicId, eq(invoices.id, id)));
  return { id, ...updated };
};

export const findInvoiceById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(invoices)
    .where(withClinicAndFilter(invoices, clinicId, eq(invoices.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findByCustomer = async (clinicId: string, customerId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(invoices)
    .where(withClinicAndFilter(invoices, clinicId, eq(invoices.customer_id, customerId)));
};

export const findInvoicesByCustomer = findByCustomer;

export const addInvoiceItem = async (data: InvoiceItemData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = { id, ...data };
  await db.insert(invoiceItems).values(record);
  return record;
};

export const buildInvoiceFromMedicalRecord = async (
  clinicId: string,
  medicalRecordId: string,
  customerId: string
) => {
  const db = getServerDb();

  const [record] = await db
    .select()
    .from(medicalRecords)
    .where(
      withClinicAndFilter(medicalRecords, clinicId, eq(medicalRecords.id, medicalRecordId))
    )
    .limit(1);

  if (!record) throw new Error("Medical record not found");

  const invoiceId = uuidv4();
  const invoiceRecord = {
    id: invoiceId,
    clinic_id: clinicId,
    customer_id: customerId,
    appointment_id: null,
    total_amount: "0",
    status: "PENDING",
    issued_at: new Date(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db.insert(invoices).values(invoiceRecord);
  return invoiceRecord;
};