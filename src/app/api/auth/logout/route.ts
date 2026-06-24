import { z } from 'zod'
import { getServerPool } from '@/lib/db/server/client'

const bodySchema = z.object({ deviceId: z.string().optional(), userId: z.string().optional() })

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })
  const { deviceId } = parsed.data
  const pool = getServerPool()
  try {
    if (deviceId) {
      await pool.query('DELETE FROM sessions WHERE device_id=$1', [deviceId])
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
