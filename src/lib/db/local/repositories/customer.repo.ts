import { getLocalDb } from '@/lib/db/local/client'
import { customers } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'

export const createCustomer = async (data: any) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert((db as any).customers).values(record)
  // optimistic return
  writeToSyncQueue('customers', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_CUSTOMER', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateCustomer = async (id: string, patch: any) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update((db as any).customers).set(updated).where((db as any).customers.id.eq(id))
  writeToSyncQueue('customers', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_CUSTOMER', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const softDeleteCustomer = async (id: string) => {
  const db = getLocalDb()
  const deleted_at = new Date()
  await db.update((db as any).customers).set({ deleted_at }).where((db as any).customers.id.eq(id))
  writeToSyncQueue('customers', id, 'DELETE', { id })
  writeAuditLog({ action: 'DELETE_CUSTOMER', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return { id, deleted_at }
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from((db as any).customers).where((db as any).customers.id.eq(id)).limit(1)
  return res[0] || null
}

export const search = async (query: string, page = 1, limit = 20) => {
  const db = getLocalDb()
  const offset = (page - 1) * limit
  const q = `%${query}%`
  const res = await db.select().from((db as any).customers).where(((db as any).customers.full_name as any).ilike(q).or((db as any).customers.phone as any).ilike(q)).limit(limit).offset(offset)
  return res
}
