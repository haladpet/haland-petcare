import { z } from 'zod'
import { getServerPool } from '@/lib/db/server/client'
import { verifyPassword } from '@/lib/auth/password'
import { generateDeviceFingerprint, signDeviceFingerprint } from '@/lib/auth/device'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import crypto from 'crypto'

const bodySchema = z.object({ email: z.string().email(), password: z.string().min(1), deviceFingerprint: z.string().optional(), deviceInfo: z.any().optional() })

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })

  const { email, password, deviceFingerprint, deviceInfo } = parsed.data
  const pool = getServerPool()
  const client = await pool.connect()
  try {
    const userRes = await client.query(`SELECT * FROM server_users WHERE email=$1 LIMIT 1`, [email])
    const user = userRes.rows[0]
    if (!user) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })

    const rawFingerprint = deviceFingerprint || generateDeviceFingerprint(deviceInfo || {})
    const deviceRow = await client.query(`SELECT * FROM devices WHERE user_id=$1 AND device_fingerprint_hash=$2 LIMIT 1`, [user.id, signDeviceFingerprint(rawFingerprint, 'placeholder')])
    let deviceSecretToReturn: string | null = null
    let deviceId: string | null = null

    // If device not exists, create new device with generated secret
    if (!deviceRow.rows[0]) {
      const deviceSecret = crypto.randomBytes(32).toString('hex')
      const signed = signDeviceFingerprint(rawFingerprint, deviceSecret)
      const insert = await client.query(`INSERT INTO devices(user_id, clinic_id, device_fingerprint_hash, device_secret, created_at) VALUES($1,$2,$3,$4,now()) RETURNING id`, [user.id, user.clinic_id, signed, deviceSecret])
      deviceId = insert.rows[0].id
      deviceSecretToReturn = deviceSecret
    } else {
      deviceId = deviceRow.rows[0].id
    }

    const payload = { userId: user.id, clinicId: user.clinic_id, role: user.role, deviceId: deviceId ?? undefined }
    const accessToken = await signAccessToken(payload)
    const refreshToken = await signRefreshToken(payload)

    const safeUser = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, clinic_id: user.clinic_id }

    return new Response(JSON.stringify({ accessToken, refreshToken, user: safeUser, deviceSecret: deviceSecretToReturn }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  } finally {
    client.release()
  }
}
