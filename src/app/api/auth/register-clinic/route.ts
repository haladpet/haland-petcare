import { z } from 'zod'
import { hashPassword } from '@/lib/auth/password'
import { getServerPool } from '@/lib/db/server/client'

const bodySchema = z.object({
  clinic_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone: z.string().optional(),
})

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })

  const { clinic_name, email, password, full_name, phone } = parsed.data
  const pool = getServerPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const clinicRes = await client.query(`INSERT INTO clinics(name, created_at) VALUES($1, now()) RETURNING id`, [clinic_name])
    const clinicId = clinicRes.rows[0].id
    const passwordHash = await hashPassword(password)
    const userRes = await client.query(
      `INSERT INTO server_users(email, password_hash, phone, full_name, role, clinic_id, status, created_at) VALUES($1,$2,$3,$4,'OWNER',$5,'ACTIVE',now()) RETURNING id,email,full_name,role,clinic_id,status,created_at`,
      [email, passwordHash, phone || null, full_name, clinicId]
    )
    await client.query('COMMIT')
    const user = userRes.rows[0]
    return new Response(JSON.stringify({ ok: true, clinicId, user }), { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    await client.query('ROLLBACK')
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500 })
  } finally {
    client.release()
  }
}
