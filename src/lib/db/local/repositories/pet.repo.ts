import { getLocalDb } from '@/lib/db/local/client'
import { pets } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, like, or, sql } from 'drizzle-orm'

interface PetData {
  customer_id?: string
  clinic_id?: string
  name?: string
  species?: string
  age_unit?: string
  breed?: string
  gender?: string
  date_of_birth?: Date
  color?: string
  weight?: string
  status?: string
}

export const createPet = async (data: PetData) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = { id, ...data, created_at: new Date(), updated_at: new Date() }
  await db.insert(pets).values(record as any)
  writeToSyncQueue('pets', id, 'CREATE', record)
  writeAuditLog({ action: 'CREATE_PET', user_id: null, clinic_id: data.clinic_id || null, status: 'INFO', details: { id } })
  return record
}

export const updatePet = async (id: string, patch: PetData) => {
  const db = getLocalDb()
  const updated = { ...patch, updated_at: new Date() }
  await db.update(pets).set(updated as any).where(eq(pets.id, id))
  writeToSyncQueue('pets', id, 'UPDATE', updated)
  writeAuditLog({ action: 'UPDATE_PET', user_id: null, clinic_id: patch.clinic_id || null, status: 'INFO', details: { id } })
  return { id, ...updated }
}

export const softDeletePet = async (id: string) => {
  const db = getLocalDb()
  const deleted_at = new Date()
  await db.update(pets).set({ deleted_at } as any).where(eq(pets.id, id))
  writeToSyncQueue('pets', id, 'DELETE', { id })
  writeAuditLog({ action: 'DELETE_PET', user_id: null, clinic_id: null, status: 'INFO', details: { id } })
  return { id, deleted_at }
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(pets).where(eq(pets.id, id)).limit(1)
  return res[0] || null
}

export const findByCustomer = async (customerId: string) => {
  const db = getLocalDb()
  return db.select().from(pets).where(eq(pets.customer_id, customerId))
}

export const search = async (query: string, page: number = 1, limit: number = 20) => {
  const db = getLocalDb()
  const offset = (page - 1) * limit
  const searchPattern = `%${query}%`

  const results = await db
    .select()
    .from(pets)
    .where(
      or(
        like(pets.name, searchPattern),
        like(pets.breed, searchPattern),
        like(pets.species, searchPattern)
      )
    )
    .limit(limit)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pets)
    .where(
      or(
        like(pets.name, searchPattern),
        like(pets.breed, searchPattern),
        like(pets.species, searchPattern)
      )
    )

  return {
    data: results,
    total: countResult?.count || 0,
    page,
    limit,
  }
}