import { getLocalDb } from '@/lib/db/local/client'
import { cages } from '@/lib/db/local/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeToSyncQueue } from '@/lib/sync/queue'
import { writeAuditLog } from '@/lib/db/server/audit'
import { eq, and, sql } from 'drizzle-orm'

export const findAvailable = async (species?: string, size?: string) => {
  const db = getLocalDb()
  const filters: any[] = [eq(cages.status, 'AVAILABLE')]

  // type field can store species/size info like 'DOG_SMALL', 'CAT_LARGE', etc.
  if (species) {
    filters.push(sql`${cages.type} ILIKE ${'%' + species + '%'}`)
  }
  if (size) {
    filters.push(sql`${cages.type} ILIKE ${'%' + size + '%'}`)
  }

  const results = await db.select().from(cages).where(and(...filters)).orderBy(cages.code)
  return results
}

export const findAll = async () => {
  const db = getLocalDb()
  return db.select().from(cages).orderBy(cages.code)
}

export const findById = async (id: string) => {
  const db = getLocalDb()
  const res = await db.select().from(cages).where(eq(cages.id, id)).limit(1)
  return res[0] || null
}

export const updateCageStatus = async (id: string, status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE') => {
  const db = getLocalDb()
  await db.update(cages)
    .set({ status, updated_at: new Date() })
    .where(eq(cages.id, id))
  writeToSyncQueue('cages', id, 'UPDATE', { status })
  writeAuditLog({
    action: 'UPDATE_CAGE_STATUS',
    user_id: null,
    clinic_id: null,
    status: 'INFO',
    details: { cage_id: id, new_status: status },
  })
  return { id, status }
}

export const createCage = async (data: { clinic_id: string; code: string; description?: string; type?: string }) => {
  const db = getLocalDb()
  const id = uuidv4()
  const record = {
    id,
    clinic_id: data.clinic_id,
    code: data.code,
    description: data.description || null,
    type: data.type || null,
    status: 'AVAILABLE' as const,
    created_at: new Date(),
    updated_at: new Date(),
  }
  await db.insert(cages).values(record)
  writeToSyncQueue('cages', id, 'CREATE', record)
  writeAuditLog({
    action: 'CREATE_CAGE',
    user_id: null,
    clinic_id: data.clinic_id,
    status: 'INFO',
    details: { id, code: data.code },
  })
  return record
}