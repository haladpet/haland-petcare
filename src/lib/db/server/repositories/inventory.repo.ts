import { getServerDb } from "@/lib/db/server/client";
import {
  inventoryItems,
  inventoryBatches,
  inventoryTransactions,
} from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq, and, sql, lt, gt, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface InventoryItemData {
  name?: string;
  sku?: string;
  description?: string;
  unit?: string;
}

interface InventoryBatchData {
  inventory_item_id?: string;
  batch_number?: string;
  quantity?: number;
  received_at?: Date;
  expires_at?: Date;
}

interface InventoryTransactionData {
  inventory_item_id?: string;
  batch_id?: string;
  transaction_type?: string;
  quantity?: number;
  reference_id?: string;
  notes?: string;
}

export const createInventoryItem = async (clinicId: string, data: InventoryItemData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    name: data.name || "",
    sku: data.sku || null,
    description: data.description || null,
    unit: data.unit || null,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(inventoryItems).values(record);
  return record;
};

export const updateInventoryItem = async (
  clinicId: string,
  id: string,
  patch: InventoryItemData
) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(inventoryItems)
    .set(updated)
    .where(withClinicAndFilter(inventoryItems, clinicId, eq(inventoryItems.id, id)));
  return { id, ...updated };
};

export const findInventoryItemById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(inventoryItems)
    .where(withClinicAndFilter(inventoryItems, clinicId, eq(inventoryItems.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findByClinic = async (clinicId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(inventoryItems)
    .where(withClinicFilter(inventoryItems, clinicId));
};

export const createBatch = async (data: InventoryBatchData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    inventory_item_id: data.inventory_item_id || "",
    batch_number: data.batch_number || null,
    quantity: data.quantity || 0,
    received_at: data.received_at || null,
    expires_at: data.expires_at || null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(inventoryBatches).values(record);
  return record;
};

export const addBatch = createBatch;

export const createTransaction = async (clinicId: string, data: InventoryTransactionData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    inventory_item_id: data.inventory_item_id || "",
    batch_id: data.batch_id || null,
    clinic_id: clinicId,
    transaction_type: data.transaction_type || "OUTGOING",
    quantity: data.quantity || 0,
    reference_id: data.reference_id || null,
    notes: data.notes || null,
    created_at: new Date(),
  };
  await db.insert(inventoryTransactions).values(record);
  return record;
};

export const getLowStockItems = async (clinicId: string, threshold: number = 10) => {
  const db = getServerDb();
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
    .where(withClinicFilter(inventoryItems, clinicId))
    .groupBy(inventoryItems.id)
    .having(sql`COALESCE(SUM(${inventoryBatches.quantity}), 0) < ${threshold}`);

  return items;
};

export const getExpiringSoonItems = async (clinicId: string, days: number = 30) => {
  const db = getServerDb();
  const cutoffDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

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
        withClinicFilter(inventoryItems, clinicId),
        lt(inventoryBatches.expires_at, cutoffDate),
        gt(inventoryBatches.quantity, 0)
      )
    )
    .orderBy(asc(inventoryBatches.expires_at));
};

export const getStock = async (inventoryItemId: string) => {
  const db = getServerDb();
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${inventoryBatches.quantity}), 0)::int` })
    .from(inventoryBatches)
    .where(eq(inventoryBatches.inventory_item_id, inventoryItemId));

  return result?.total || 0;
};

export const deductInventory = async (
  inventoryItemId: string,
  batchId: string,
  quantity: number,
  referenceId?: string,
  notes?: string
) => {
  const db = getServerDb();

  const [batch] = await db
    .select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.id, batchId))
    .limit(1);

  if (!batch) throw new Error(`Batch ${batchId} not found`);
  if (batch.quantity < quantity) throw new Error(`Insufficient stock in batch ${batchId}`);

  const newQuantity = batch.quantity - quantity;
  await db
    .update(inventoryBatches)
    .set({ quantity: newQuantity, updated_at: new Date() })
    .where(eq(inventoryBatches.id, batchId));

  const transactionId = uuidv4();
  await db.insert(inventoryTransactions).values({
    id: transactionId,
    inventory_item_id: inventoryItemId,
    batch_id: batchId,
    clinic_id: "", // Will be set by caller
    transaction_type: "OUTGOING",
    quantity: -quantity,
    reference_id: referenceId || null,
    notes: notes || null,
    created_at: new Date(),
  });

  return { batchId, newQuantity, transactionId };
};