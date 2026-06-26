import { getLocalDb } from '@/lib/db/local/client'
import { inventoryItems, inventoryBatches, inventoryTransactions } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq } from 'drizzle-orm'

interface InventoryItemData {
  clinic_id?: string
  name?: string
  sku?: string
  description?: string
  unit?: string
}

interface InventoryBatchData {
  inventory_item_id?: string
  batch_number?: string
  quantity?: number
  received_at?: Date
  expires_at?: Date
}

interface InventoryTransactionData {
  inventory_item_id?: string
  batch_id?: string
  clinic_id?: string
  transaction_type?: string
  quantity?: number
  reference_id?: string
  notes?: string
}

export const createInventoryItem = async (data: InventoryItemData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(inventoryItems).values(record)
  writeToSyncQueue('inventory_items', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_INVENTORY_ITEM', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updateInventoryItem = async (id: string, patch: InventoryItemData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(inventoryItems).set(updated).where(eq(inventoryItems.id, id))
  writeToSyncQueue('inventory_items', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_INVENTORY_ITEM', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const findInventoryItemById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1)
  return res[0] || null
}

export const findByClinic = async (clinicId: string) => {
  const db = getLocalDb()
  return db.select().from(inventoryItems).where(eq(inventoryItems.clinic_id, clinicId))
}

export const createBatch = async (data: InventoryBatchData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(inventoryBatches).values(record)
  return record
}

export const createTransaction = async (data: InventoryTransactionData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date() }
  await db.insert(inventoryTransactions).values(record)
  writeAuditLog({ action: 'INVENTORY_TRANSACTION', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}