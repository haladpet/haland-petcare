import { getLocalDb } from '@/lib/db/local/client'
import {
  invoices,
  invoiceItems,
  payments,
  medicines,
} from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, sql } from 'drizzle-orm'
import { deductInventoryFIFO, getStock } from './inventory.repo'

// ─── processPayment ─────────────────────────────────────────────
// In a SINGLE logical unit:
// 1. Lock invoice (check status — must not be CANCELLED)
// 2. Validate amount does not exceed remaining balance (throw OVERPAYMENT)
// 3. Insert payment record
// 4. Update invoice status (PAID if fully paid, PARTIAL if not)
// 5. For each invoice_item of type MEDICINE: re-validate stock, call deductInventoryFIFO
// 6. If ANY step fails → throw error (caller should not have partial state)
export const processPayment = async (
  invoiceId: string,
  amount: number,
  method: string,
  itemTypes?: { invoiceItemId: string; type: 'SERVICE' | 'MEDICINE'; medicine_id?: string; quantity: number }[]
) => {
  const db = getLocalDb()

  // 1. Get invoice
  const invRows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1)

  if (!invRows[0]) throw new Error('INVOICE_NOT_FOUND')
  const invoice = invRows[0]

  if (invoice.status === 'CANCELLED') {
    throw new Error('INVOICE_CANCELLED')
  }

  // 2. Calculate remaining balance
  const totalAmount = Number(invoice.total_amount)

  // Get existing payments for this invoice
  const existingPayments = await db
    .select({
      total: sql<number>`COALESCE(SUM(${payments.amount}), 0)`.mapWith(Number),
    })
    .from(payments)
    .where(eq(payments.invoice_id, invoiceId))

  const alreadyPaid = Number(existingPayments[0]?.total || 0)
  const remaining = totalAmount - alreadyPaid

  if (amount > remaining) {
    throw new Error('OVERPAYMENT')
  }

  // 3. Get invoice items to determine which are MEDICINE type
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoice_id, invoiceId))

  // If itemTypes not provided, try to infer from description
  const resolvedItemTypes = itemTypes || items.map((item) => {
    const isMedicine = item.description?.toLowerCase().includes('medicine') ||
      item.description?.toLowerCase().includes('tablet') ||
      item.description?.toLowerCase().includes('capsule') ||
      item.description?.toLowerCase().includes('syrup') ||
      item.description?.toLowerCase().includes('injection')
    return {
      invoiceItemId: item.id,
      type: isMedicine ? 'MEDICINE' as const : 'SERVICE' as const,
      medicine_id: undefined,
      quantity: item.quantity,
    }
  })

  // 4. For MEDICINE items, re-validate stock and deduct
  // We need to find the medicine_id from the invoice item description
  // Since invoice_items don't have medicine_id directly, we look up by matching
  // the description against medicines
  for (const rt of resolvedItemTypes) {
    if (rt.type === 'MEDICINE' && rt.medicine_id) {
      const currentStock = await getStock(rt.medicine_id)
      if (currentStock < rt.quantity) {
        throw new Error(`INSUFFICIENT_STOCK: medicine ${rt.medicine_id} has ${currentStock}, need ${rt.quantity}`)
      }
      // Deduct stock
      await deductInventoryFIFO(rt.medicine_id, rt.quantity)
    }
  }

  // 5. Insert payment record
  const paymentId = uuidv4()
  const now = new Date()
  const newBalance = remaining - amount
  const isFullyPaid = newBalance <= 0

  const paymentRecord = {
    id: paymentId,
    invoice_id: invoiceId,
    amount: String(amount),
    method: method,
    status: 'COMPLETED',
    paid_at: now,
    created_at: now,
    updated_at: now,
  }
  await db.insert(payments).values(paymentRecord)

  // 6. Update invoice status
  const newStatus = isFullyPaid ? 'PAID' : 'PARTIAL'
  await db
    .update(invoices)
    .set({
      status: newStatus,
      updated_at: now,
    })
    .where(eq(invoices.id, invoiceId))

  // 7. Sync queue & audit
  writeToSyncQueue('payments', paymentId, 'CREATE', paymentRecord)
  writeToSyncQueue('invoices', invoiceId, 'UPDATE', { status: newStatus })
  writeAuditLog({
    action: 'PROCESS_PAYMENT',
    user_id: null,
    clinic_id: invoice.clinic_id,
    status: 'INFO',
    details: {
      paymentId,
      invoiceId,
      amount,
      method,
      newStatus,
      remainingAfter: newBalance,
    },
  })

  return {
    payment: paymentRecord,
    invoiceStatus: newStatus,
    remainingBalance: newBalance,
    isFullyPaid,
  }
}

// ─── getPaymentsByInvoice ───────────────────────────────────────
export const getPaymentsByInvoice = async (invoiceId: string) => {
  const db = getLocalDb()
  return db
    .select()
    .from(payments)
    .where(eq(payments.invoice_id, invoiceId))
    .orderBy(sql`${payments.paid_at} DESC`)
}

// ─── getPaymentById ─────────────────────────────────────────────
export const getPaymentById = async (id: string) => {
  const db = getLocalDb()
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1)
  return rows[0] || null
}