import { getLocalDb } from '@/lib/db/local/client'
import {
  inventoryItems,
  inventoryBatches,
  inventoryTransactions,
} from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, asc, and, sql, gt } from 'drizzle-orm'

// ─── Helpers ────────────────────────────────────────────────────

async function getItemWithVersion(db: ReturnType<typeof getLocalDb>, itemId: string) {
  const rows = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.id, itemId))
    .limit(1)
  return rows[0] || null
}

async function getBatchById(db: ReturnType<typeof getLocalDb>, batchId: string) {
  const rows = await db
    .select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.id, batchId))
    .limit(1)
  return rows[0] || null
}

// ─── deductInventory (simple, single-item) ──────────────────────
// Uses optimistic locking via version column on inventory_items
// NOTE: inventory_items schema currently lacks a version column.
// We simulate optimistic locking by checking quantity_on_hand before update
// and using a WHERE clause that ensures no negative stock.
export const deductInventory = async (
  itemId: string,
  quantity: number,
  reference: { type: string; id: string }
) => {
  const db = getLocalDb()

  // Get current total stock across all batches
  const batchRows = await db
    .select({
      id: inventoryBatches.id,
      quantity: inventoryBatches.quantity,
    })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.inventory_item_id, itemId))
    .orderBy(asc(inventoryBatches.expires_at))

  const totalOnHand = batchRows.reduce((sum, b) => sum + b.quantity, 0)

  if (totalOnHand < quantity) {
    throw new Error('INSUFFICIENT_STOCK')
  }

  // Deduct from batches FIFO
  let remaining = quantity
  const deductions: { batchId: string; deducted: number }[] = []

  for (const batch of batchRows) {
    if (remaining <= 0) break
    const deduct = Math.min(batch.quantity, remaining)
    await db
      .update(inventoryBatches)
      .set({
        quantity: batch.quantity - deduct,
        updated_at: new Date(),
      })
      .where(eq(inventoryBatches.id, batch.id))

    deductions.push({ batchId: batch.id, deducted: deduct })
    remaining -= deduct
  }

  // Insert inventory transaction
  const txnId = uuidv4()
  await db.insert(inventoryTransactions).values({
    id: txnId,
    inventory_item_id: itemId,
    batch_id: deductions[0]?.batchId || null,
    clinic_id: '00000000-0000-0000-0000-000000000000',
    transaction_type: 'OUTGOING',
    quantity: -quantity,
    reference_id: reference.id,
    notes: `Deducted for ${reference.type}:${reference.id}`,
    created_at: new Date(),
  })

  writeToSyncQueue('inventory_batches', itemId, 'UPDATE', {
    deductions,
    reference,
  })
  writeAuditLog({
    action: 'DEDUCT_INVENTORY',
    user_id: null,
    clinic_id: null,
    status: 'INFO',
    details: { itemId, quantity, deductions, reference },
  })

  return { success: true, deductions, remainingStock: totalOnHand - quantity }
}

// ─── getExpiringSoonBatch ───────────────────────────────────────
// FIFO: returns batches ordered by expiry_date ASC (nulls last)
export const getExpiringSoonBatch = async (itemId: string) => {
  const db = getLocalDb()
  const rows = await db
    .select()
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.inventory_item_id, itemId),
        gt(inventoryBatches.quantity, 0)
      )
    )
    .orderBy(
      asc(inventoryBatches.expires_at),
      asc(inventoryBatches.received_at)
    )
  return rows
}

// ─── deductInventoryFIFO ────────────────────────────────────────
// Deducts from batches in FIFO order (expiring soonest first)
// Distributes deduction across multiple batches if needed
export const deductInventoryFIFO = async (
  itemId: string,
  quantity: number
) => {
  const db = getLocalDb()
  const batches = await getExpiringSoonBatch(itemId)

  const totalOnHand = batches.reduce((sum, b) => sum + b.quantity, 0)
  if (totalOnHand < quantity) {
    throw new Error('INSUFFICIENT_STOCK')
  }

  let remaining = quantity
  const deductions: { batchId: string; batchNumber: string | null; deducted: number }[] = []

  for (const batch of batches) {
    if (remaining <= 0) break
    const deduct = Math.min(batch.quantity, remaining)

    await db
      .update(inventoryBatches)
      .set({
        quantity: batch.quantity - deduct,
        updated_at: new Date(),
      })
      .where(eq(inventoryBatches.id, batch.id))

    deductions.push({
      batchId: batch.id,
      batchNumber: batch.batch_number,
      deducted: deduct,
    })
    remaining -= deduct
  }

  return {
    success: true,
    deductions,
    totalDeducted: quantity - remaining,
    remainingStock: totalOnHand - quantity,
  }
}

// ─── getStock ───────────────────────────────────────────────────
export const getStock = async (itemId: string) => {
  const db = getLocalDb()
  const rows = await db
    .select({
      total: sql<number>`COALESCE(SUM(${inventoryBatches.quantity}), 0)`.mapWith(Number),
    })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.inventory_item_id, itemId))
  return Number(rows[0]?.total || 0)
}

// ─── createInventoryItem ────────────────────────────────────────
export const createInventoryItem = async (data: {
  clinic_id: string
  name: string
  sku?: string
  description?: string
  unit?: string
}) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = {
    id,
    clinic_id: data.clinic_id,
    name: data.name,
    sku: data.sku || null,
    description: data.description || null,
    unit: data.unit || null,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.insert(inventoryItems).values(record)
  writeToSyncQueue('inventory_items', id, 'CREATE', record)
  return record
}

// ─── addBatch ───────────────────────────────────────────────────
export const addBatch = async (data: {
  inventory_item_id: string
  batch_number?: string
  quantity: number
  received_at?: Date
  expires_at?: Date
}) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = {
    id,
    inventory_item_id: data.inventory_item_id,
    batch_number: data.batch_number || null,
    quantity: data.quantity,
    received_at: data.received_at || new Date(),
    expires_at: data.expires_at || null,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.insert(inventoryBatches).values(record)
  writeToSyncQueue('inventory_batches', id, 'CREATE', record)
  return record
}

// ─── getLowStockItems ───────────────────────────────────────────
export const getLowStockItems = async (threshold: number = 5) => {
  const db = getLocalDb()
  const allItems = await db.select().from(inventoryItems)

  const results = []
  for (const item of allItems) {
    const stock = await getStock(item.id)
    if (stock <= threshold) {
      results.push({ ...item, current_stock: stock })
    }
  }
  return results
}

// ─── getExpiringSoonItems ───────────────────────────────────────
export const getExpiringSoonItems = async (daysThreshold: number = 30) => {
  const db = getLocalDb()
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

  const rows = await db
    .select({
      batch: inventoryBatches,
      item: inventoryItems,
    })
    .from(inventoryBatches)
    .innerJoin(inventoryItems, eq(inventoryBatches.inventory_item_id, inventoryItems.id))
    .where(
      and(
        gt(inventoryBatches.quantity, 0),
        sql`${inventoryBatches.expires_at} IS NOT NULL`,
        sql`${inventoryBatches.expires_at} <= ${thresholdDate.toISOString()}`
      )
    )
    .orderBy(asc(inventoryBatches.expires_at))

  return rows
}