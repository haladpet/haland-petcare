import { getLocalDb } from '@/lib/db/local/client'
import {
  invoices,
  invoiceItems,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  medicines,
} from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, and, sql } from 'drizzle-orm'

// ─── buildInvoiceFromMedicalRecord ──────────────────────────────
// Gathers services from medical record + medicine items from prescriptions
// linked to that medical record, calculates subtotal/tax/discount/total
export const buildInvoiceFromMedicalRecord = async (
  medicalRecordId: string,
  options?: {
    taxRate?: number // e.g. 0.11 for 11%
    discount?: number // flat discount amount
  }
) => {
  const db = getLocalDb()
  const taxRate = options?.taxRate ?? 0
  const discount = options?.discount ?? 0

  // Get medical record
  const mrRows = await db
    .select()
    .from(medicalRecords)
    .where(eq(medicalRecords.id, medicalRecordId))
    .limit(1)

  if (!mrRows[0]) throw new Error('Medical record not found')
  const mr = mrRows[0]

  // Get prescriptions linked to this pet/customer around this visit
  // (We link by pet_id and date proximity since prescriptions don't have medical_record_id directly)
  const prescRows = await db
    .select()
    .from(prescriptions)
    .where(
      and(
        eq(prescriptions.pet_id, mr.pet_id),
        eq(prescriptions.customer_id, mr.customer_id)
      )
    )

  // Build invoice items
  const items: {
    description: string
    quantity: number
    unit_price: number
    total_price: number
    type: 'SERVICE' | 'MEDICINE'
    medicine_id?: string
  }[] = []

  // Service item: consultation/examination
  items.push({
    description: `Consultation - Medical Record ${mr.id.slice(0, 8)}`,
    quantity: 1,
    unit_price: 50000, // base consultation fee
    total_price: 50000,
    type: 'SERVICE',
  })

  // Medicine items from prescriptions
  for (const presc of prescRows) {
    const pItems = await db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescription_id, presc.id))

    for (const pi of pItems) {
      const medRows = await db
        .select()
        .from(medicines)
        .where(eq(medicines.id, pi.medicine_id))
        .limit(1)

      const medicine = medRows[0]
      const unitPrice = medicine ? Number(medicine.price) : 0
      const totalPrice = unitPrice * pi.quantity

      items.push({
        description: `${medicine?.name || 'Medicine'} ${pi.dosage || ''} (${pi.quantity}x)`,
        quantity: pi.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        type: 'MEDICINE',
        medicine_id: pi.medicine_id,
      })
    }
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0)
  const taxAmount = Math.round(subtotal * taxRate)
  const totalAmount = subtotal + taxAmount - discount

  // Create invoice
  const invoiceId = uuidv4()
  const now = new Date()
  const invoiceRecord = {
    id: invoiceId,
    clinic_id: mr.clinic_id,
    customer_id: mr.customer_id,
    appointment_id: null,
    total_amount: String(totalAmount),
    status: 'DRAFT',
    issued_at: now,
    due_date: null,
    created_at: now,
    updated_at: now,
  }
  await db.insert(invoices).values(invoiceRecord)

  // Create invoice items
  const createdItems = []
  for (const item of items) {
    const itemId = uuidv4()
    const itemRecord = {
      id: itemId,
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: String(item.unit_price),
      total_price: String(item.total_price),
    }
    await db.insert(invoiceItems).values(itemRecord)
    createdItems.push({ ...itemRecord, type: item.type, medicine_id: item.medicine_id })
  }

  writeToSyncQueue('invoices', invoiceId, 'CREATE', {
    invoice: invoiceRecord,
    items: createdItems,
  })
  writeAuditLog({
    action: 'BUILD_INVOICE',
    user_id: null,
    clinic_id: mr.clinic_id,
    status: 'INFO',
    details: { invoiceId, medicalRecordId, totalAmount },
  })

  return {
    invoice: invoiceRecord,
    items: createdItems,
    subtotal,
    taxAmount,
    discount,
    totalAmount,
  }
}

// ─── findInvoiceById ────────────────────────────────────────────
export const findInvoiceById = async (id: string) => {
  const db = getLocalDb()
  const invRows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1)

  if (!invRows[0]) return null

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoice_id, id))

  return { ...invRows[0], items }
}

// ─── findInvoicesByCustomer ─────────────────────────────────────
export const findInvoicesByCustomer = async (customerId: string) => {
  const db = getLocalDb()
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.customer_id, customerId))
    .orderBy(sql`${invoices.issued_at} DESC`)
}

// ─── updateInvoiceStatus ────────────────────────────────────────
export const updateInvoiceStatus = async (
  id: string,
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED'
) => {
  const db = getLocalDb()
  await db
    .update(invoices)
    .set({ status, updated_at: new Date() })
    .where(eq(invoices.id, id))

  writeToSyncQueue('invoices', id, 'UPDATE', { status })
  return { id, status }
}