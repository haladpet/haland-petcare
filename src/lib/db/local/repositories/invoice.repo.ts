import { getLocalDb } from '@/lib/db/local/client'
import { invoices, invoiceItems } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq } from 'drizzle-orm'

interface InvoiceData {
  clinic_id?: string
  customer_id?: string
  appointment_id?: string
  total_amount?: string
  status?: string
  due_date?: Date
}

interface InvoiceItemData {
  invoice_id?: string
  description?: string
  quantity?: number
  unit_price?: string
  total_price?: string
}

export const createInvoice = async (data: InvoiceData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, issued_at: new Date(), created_at: new Date(), updated_at: new Date() }
  await db.insert(invoices).values(record)
  writeToSyncQueue('invoices', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_INVOICE', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateInvoice = async (id: string, patch: InvoiceData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(invoices).set(updated).where(eq(invoices.id, id))
  writeToSyncQueue('invoices', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_INVOICE', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findInvoiceById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
  return res[0] || null
}

export const findByCustomer = async (customerId: string) => {
  const db = getLocalDb()
  return db.select().from(invoices).where(eq(invoices.customer_id, customerId))
}

export const addInvoiceItem = async (data: InvoiceItemData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data }
  await db.insert(invoiceItems).values(record)
  return record
}