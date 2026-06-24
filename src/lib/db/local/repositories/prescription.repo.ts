import { getLocalDb } from '@/lib/db/local/client'
import { prescriptions, prescriptionItems, medicines } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, and, sql } from 'drizzle-orm'

export interface PrescriptionItemInput {
  medicine_id: string
  dosage?: string
  quantity: number
  instructions?: string
}

export const createPrescription = async (
  data: {
    clinic_id: string
    customer_id: string
    pet_id: string
    prescribed_by?: string
    notes?: string
  },
  items: PrescriptionItemInput[]
) => {
  const db = getLocalDb()
  const prescriptionId = uuidv4()

  // Check stock for each medicine (warning only, don't block)
  const stockWarnings: { medicine_id: string; name: string; requested: number; available: number }[] = []

  for (const item of items) {
    // Get medicine info
    const medRes = await db.select().from(medicines).where(eq(medicines.id, item.medicine_id)).limit(1)
    const medicine = medRes[0]

    // Check inventory stock via inventory_batches
    const batches = await db.select({
      total: sql<number>`COALESCE(SUM(quantity), 0)`.mapWith(Number),
    }).from((db as any).inventory_batches)
      .where(eq((db as any).inventory_batches.inventory_item_id, item.medicine_id))

    const availableStock = Number(batches[0]?.total || 0)

    if (availableStock < item.quantity) {
      stockWarnings.push({
        medicine_id: item.medicine_id,
        name: medicine?.name || 'Unknown',
        requested: item.quantity,
        available: availableStock,
      })
    }
  }

  // Insert prescription
  const prescriptionRecord = {
    id: prescriptionId,
    clinic_id: data.clinic_id,
    customer_id: data.customer_id,
    pet_id: data.pet_id,
    prescribed_by: data.prescribed_by || null,
    date: new Date(),
    status: 'ACTIVE',
    notes: data.notes || null,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.insert(prescriptions).values(prescriptionRecord)

  // Insert prescription items
  const insertedItems = []
  for (const item of items) {
    const itemId = uuidv4()
    const itemRecord = {
      id: itemId,
      prescription_id: prescriptionId,
      medicine_id: item.medicine_id,
      dosage: item.dosage || null,
      quantity: item.quantity,
      instructions: item.instructions || null,
    }
    await db.insert(prescriptionItems).values(itemRecord)
    insertedItems.push(itemRecord)
  }

  writeToSyncQueue('prescriptions', prescriptionId, 'CREATE', {
    prescription: prescriptionRecord,
    items: insertedItems,
  })
  writeAuditLog({
    action: 'CREATE_PRESCRIPTION',
    user_id: null,
    clinic_id: data.clinic_id,
    status: 'INFO',
    details: { id: prescriptionId, pet_id: data.pet_id },
  })

  return {
    prescription: prescriptionRecord,
    items: insertedItems,
    stockWarnings: stockWarnings.length > 0 ? stockWarnings : undefined,
  }
}

export const findPrescriptionById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(prescriptions).where(eq(prescriptions.id, id)).limit(1)
  if (!res[0]) return null

  const items = await db.select().from(prescriptionItems).where(eq(prescriptionItems.prescription_id, id))
  return { ...res[0], items }
}

export const findPrescriptionsByPetId = async (petId: string) => {
  const db = getLocalDb()
  const res = await db.select()
    .from(prescriptions)
    .where(eq(prescriptions.pet_id, petId))
    .orderBy(sql`${prescriptions.date} DESC`)
  return res
}