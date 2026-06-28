import { getLocalDb } from '@/lib/db/local/client'
import { customers } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, ilike, or } from 'drizzle-orm'

interface CustomerData {
  clinic_id?: string
  full_name?: string
  email?: string
  phone?: string
  address?: string
  status?: string
  metadata?: unknown
}

export const createCustomer = async (data: CustomerData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(customers).values(record as any)
  // optimistic return
  writeToSyncQueue('customers', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_CUSTOMER', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateCustomer = async (id: string, patch: CustomerData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(customers).set(updated).where(eq(customers.id, id))
  writeToSyncQueue('customers', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_CUSTOMER', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const softDeleteCustomer = async (id: string) => {
  const db = getLocalDb()
  const deleted_at = new Date()
  await db.update(customers).set({ deleted_at }).where(eq(customers.id, id))
  writeToSyncQueue('customers', id, 'DELETE', { id })
  writeAuditLog({ action: 'DELETE_CUSTOMER', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return { id, deleted_at }
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(customers).where(eq(customers.id, id)).limit(1)
  return res[0] || null
}

export const search = async (query: string, page = 1, limit = 20) => {
  const db = getLocalDb()
  const offset = (page - 1) * limit
  const q = `%${query}%`
  const res = await db.select().from(customers).where(
    or(
      ilike(customers.full_name, q),
      ilike(customers.phone, q)
    )
  ).limit(limit).offset(offset)
  return res
}