import { getServerPool } from '@/lib/db/server/client'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  // naive: in prod use verifyToken and check user
  const pool = getServerPool()
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 })
  const res = await pool.query('SELECT id, name, type, last_sync_at FROM devices WHERE user_id=$1', [userId])
  return new Response(JSON.stringify({ devices: res.rows }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
