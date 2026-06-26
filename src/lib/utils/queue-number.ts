import { getLocalDb } from '@/lib/db/local/client'
import { queues } from '@/lib/db/local/schema'
import { eq, sql } from 'drizzle-orm'

export const generateQueueNumber = async (clinicId: string): Promise<string> => {
  const db = getLocalDb()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  const [result] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(queues)
    .where(eq(queues.clinic_id, clinicId))

  const count = (result?.count || 0) + 1
  return `Q-${today}-${String(count).padStart(3, '0')}`
}