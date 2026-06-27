import { getServerDb } from "@/lib/db/server/client";
import { payments, invoices } from "@/lib/db/server/schema";
import { withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface PaymentData {
  invoice_id?: string;
  amount?: string;
  method?: string;
  status?: string;
}

export const createPayment = async (data: PaymentData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    invoice_id: data.invoice_id || "",
    amount: data.amount || "0",
    method: data.method || null,
    status: data.status || "COMPLETED",
    paid_at: new Date(),
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(payments).values(record as any);
  return record;
};

export const updatePayment = async (id: string, patch: PaymentData) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(payments)
    .set(updated as any)
    .where(eq(payments.id, id));
  return { id, ...updated };
};

export const findPaymentById = async (id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  return res[0] || null;
};

export const findByInvoice = async (invoiceId: string) => {
  const db = getServerDb();
  return db.select().from(payments).where(eq(payments.invoice_id, invoiceId));
};

export const getPaymentsByInvoice = findByInvoice;

export const processPayment = async (
  clinicId: string,
  data: { invoice_id: string; amount: number; method?: string }
) => {
  const db = getServerDb();
  const id = uuidv4();

  // Verify invoice belongs to clinic
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(withClinicAndFilter(invoices, clinicId, eq(invoices.id, data.invoice_id)))
    .limit(1);

  if (!invoice) throw new Error("NOT_FOUND: Invoice not found");

  const record = {
    id,
    invoice_id: data.invoice_id,
    amount: data.amount.toString(),
    method: data.method || null,
    status: "COMPLETED",
    paid_at: new Date(),
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db.insert(payments).values(record as any);

  await db
    .update(invoices)
    .set({ status: "PAID", updated_at: new Date() } as any)
    .where(withClinicAndFilter(invoices, clinicId, eq(invoices.id, data.invoice_id)));

  return record;
};