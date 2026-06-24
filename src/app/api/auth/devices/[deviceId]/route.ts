import { getServerPool } from '@/lib/db/server/client'

export async function DELETE(req: Request, { params }: any) {
  const deviceId = params.deviceId
  const pool = getServerPool()
  try {
    await pool.query('DELETE FROM devices WHERE id=$1', [deviceId])
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
