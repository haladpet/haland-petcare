import { getLocalDb } from '@/lib/db/local/client'

export async function generateQueueNumber(clinicId: string) {
  const db = getLocalDb()
  const today = new Date().toISOString().slice(0,10)
  // Use a transaction to avoid race conditions
  const res = await (db as any).transaction(async (tx: any) => {
    const rows = await tx.rawQuery(`SELECT queue_number FROM queues WHERE clinic_id = $1 AND created_at::date = $2 ORDER BY queue_number DESC LIMIT 1`, [clinicId, today])
    let last = 0
    if (rows && rows.length > 0 && rows[0].queue_number) {
      const parts = rows[0].queue_number.split('-')
      last = parseInt(parts[3] || '0', 10)
    }
    const next = last + 1
    const num = String(next).padStart(4, '0')
    const qn = `${clinicId}-${today}-${num}`
    return qn
  })
  return res
}
