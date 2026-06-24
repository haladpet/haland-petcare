import { getLocalDb } from '@/lib/db/local/client'

export async function writeToSyncQueue(tableName: string, recordId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', payload: any) {
  const db = getLocalDb()
  // insert into sync_queue local
  try {
    await db.insert((db as any).sync_queue).values({
      entity: tableName,
      entity_id: recordId,
      action: operation,
      payload: payload ? JSON.stringify(payload) : null,
      created_at: new Date(),
    })
  } catch (err) {
    console.error('writeToSyncQueue error', err)
  }
}
