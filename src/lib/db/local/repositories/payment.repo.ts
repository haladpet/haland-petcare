import { getLocalDb } from '@/lib/db/local/client'
import { payments, invoices } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq } from 'drizzle-orm'

interface PaymentData {
  invoice_id?: string
  amount?: string
  method?: string
  status?: string
}

export const createPayment = async (data: PaymentData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, paid_at: new Date(), created_at: new Date(), updated_at: new Date() }
  await db.insert(payments).values(record as any)
  writeToSyncQueue('payments', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_PAYMENT', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return record
}

export const updatePayment = async (id: string, patch: PaymentData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(payments).set(updated as any).where(eq(payments.id, id))
  writeToSyncQueue('payments', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_PAYMENT', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findPaymentById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(payments).where(eq(payments.id, id)).limit(1)
  return res[0] || null
}

export const findByInvoice = async (invoiceId: string) => {
  const db = getLocalDb()
  return db.select().from(payments).where(eq(payments.invoice_id, invoiceId))
}

// Alias for API route compatibility
export const getPaymentsByInvoice = findByInvoice

export const processPayment = async (data: { invoice_id: string; amount: number; method?: string }) => {
  const db = getLocalDb()
  const id = uuidv4()

  // Create payment record
  const record = {
    id,
    invoice_id: data.invoice_id,
    amount: data.amount.toString(),
    method: data.method || null,
    status: 'COMPLETED',
    paid_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  }

  await db.insert(payments).values(record as any)

  // Update invoice status
  await db
    .update(invoices)
    .set({ status: 'PAID', updated_at: new Date() } as any)
    .where(eq(invoices.id, data.invoice_id))

  writeToSyncQueue('payments', id, 'CREATE', record)
  writeAuditLog({ action: 'PROCESS_PAYMENT', user_id: null, clinic_id: null, status: 'INFO', details: { id, invoiceId: data.invoice_id, amount: data.amount } })

  return record
}