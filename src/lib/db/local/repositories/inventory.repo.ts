import { getLocalDb } from '@/lib/db/local/client'
import { inventoryItems, inventoryBatches, inventoryTransactions } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, and, sql, lt, gt, desc, asc, sum } from 'drizzle-orm'

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
  await db.insert(inventoryItems).values(record as any)
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
  await db.insert(inventoryBatches).values(record as any)
  return record
}

// Alias for API route compatibility
export const addBatch = createBatch

export const createTransaction = async (data: InventoryTransactionData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date() }
  await db.insert(inventoryTransactions).values(record as any)
  writeAuditLog({ action: 'INVENTORY_TRANSACTION', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const getLowStockItems = async (clinicId: string, threshold: number = 10) => {
  const db = getLocalDb()
  const items = await db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      unit: inventoryItems.unit,
      totalStock: sql<number>`COALESCE(SUM(${inventoryBatches.quantity}), 0)::int`,
    })
    .from(inventoryItems)
    .leftJoin(inventoryBatches, eq(inventoryBatches.inventory_item_id, inventoryItems.id))
    .where(eq(inventoryItems.clinic_id, clinicId))
    .groupBy(inventoryItems.id)
    .having(sql`COALESCE(SUM(${inventoryBatches.quantity}), 0) < ${threshold}`)

  return items
}

export const getExpiringSoonItems = async (clinicId: string, days: number = 30) => {
  const db = getLocalDb()
  const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  return db
    .select({
      id: inventoryBatches.id,
      batchNumber: inventoryBatches.batch_number,
      quantity: inventoryBatches.quantity,
      expiresAt: inventoryBatches.expires_at,
      itemId: inventoryItems.id,
      itemName: inventoryItems.name,
      itemSku: inventoryItems.sku,
    })
    .from(inventoryBatches)
    .innerJoin(inventoryItems, eq(inventoryBatches.inventory_item_id, inventoryItems.id))
    .where(
      and(
        eq(inventoryItems.clinic_id, clinicId),
        lt(inventoryBatches.expires_at, cutoffDate),
        gt(inventoryBatches.quantity, 0)
      )
    )
    .orderBy(asc(inventoryBatches.expires_at))
}

export const getStock = async (inventoryItemId: string) => {
  const db = getLocalDb()
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${inventoryBatches.quantity}), 0)::int` })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.inventory_item_id, inventoryItemId))

  return result?.total || 0
}

export const deductInventory = async (
  inventoryItemId: string,
  batchId: string,
  quantity: number,
  referenceId?: string,
  notes?: string
) => {
  const db = getLocalDb()

  // Get the batch
  const [batch] = await db
    .select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.id, batchId))
    .limit(1)

  if (!batch) throw new Error(`Batch ${batchId} not found`)
  if (batch.quantity < quantity) throw new Error(`Insufficient stock in batch ${batchId}`)

  // Deduct from batch
  const newQuantity = batch.quantity - quantity
  await db
    .update(inventoryBatches)
    .set({ quantity: newQuantity, updated_at: new Date() })
    .where(eq(inventoryBatches.id, batchId))

  // Create transaction record
  const transactionId = uuidv4()
  await db.insert(inventoryTransactions).values({
    id: transactionId,
    inventory_item_id: inventoryItemId,
    batch_id: batchId,
    transaction_type: 'OUTGOING',
    quantity: -quantity,
    reference_id: referenceId || null,
    notes: notes || null,
    created_at: new Date(),
  })

  writeAuditLog({
    action: 'DEDUCT_INVENTORY',
    user_id: null,
    clinic_id: null,
    status: 'INFO',
    details: { inventoryItemId, batchId, quantity, referenceId },
  })

  return { batchId, newQuantity, transactionId }
}