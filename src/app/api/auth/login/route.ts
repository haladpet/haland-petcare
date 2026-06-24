import { z } from 'zod'
import { getServerPool } from '@/lib/db/server/client'
import { verifyPassword } from '@/lib/auth/password'
import { generateDeviceFingerprint, signDeviceFingerprint, verifyDeviceFingerprint } from '@/lib/auth/device'
import { createSession } from '@/lib/auth/jwt'
import { writeAuditLog } from '@/lib/db/server/audit'
import crypto from 'crypto'
import type { Role } from '@/types/auth'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceFingerprint: z.string().optional(),
  deviceInfo: z.any().optional(),
})

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { email, password, deviceFingerprint, deviceInfo } = parsed.data
  const pool = getServerPool()
  const client = await pool.connect()

  try {
    // Find user
    const userRes = await client.query(
      `SELECT * FROM server_users WHERE email=$1 AND deleted_at IS NULL LIMIT 1`,
      [email]
    )
    const user = userRes.rows[0]

    if (!user) {
      await writeAuditLog({
        action: 'login:failed',
        user_id: null,
        clinic_id: null,
        resource: 'auth/login',
        status: 'DENIED',
        metadata: { reason: 'user_not_found', email },
      })
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify password
    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) {
      await writeAuditLog({
        action: 'login:failed',
        user_id: user.id,
        clinic_id: user.clinic_id,
        resource: 'auth/login',
        status: 'DENIED',
        metadata: { reason: 'invalid_password', email },
      })
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      await writeAuditLog({
        action: 'login:failed',
        user_id: user.id,
        clinic_id: user.clinic_id,
        resource: 'auth/login',
        status: 'DENIED',
        metadata: { reason: 'user_inactive', status: user.status },
      })
      return new Response(
        JSON.stringify({ error: 'Account is not active' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Device registration/verification
    const rawFingerprint = deviceFingerprint || generateDeviceFingerprint(deviceInfo || {})
    let deviceId: string | null = null
    let deviceSecretToReturn: string | null = null

    // Look up existing devices for this user
    const existingDevices = await client.query(
      `SELECT * FROM devices WHERE user_id=$1`,
      [user.id]
    )

    // Try to find a matching device by verifying fingerprint against each device's secret
    let matchedDevice = null
    for (const device of existingDevices.rows) {
      try {
        const isValid = verifyDeviceFingerprint(
          rawFingerprint,
          device.device_secret,
          device.device_fingerprint_hash
        )
        if (isValid) {
          matchedDevice = device
          break
        }
      } catch {
        // Skip devices where verification fails
        continue
      }
    }

    if (matchedDevice) {
      // Existing device — use it
      deviceId = matchedDevice.id
      // Update last seen
      await client.query(
        `UPDATE devices SET last_seen_at=now(), updated_at=now() WHERE id=$1`,
        [deviceId]
      )
    } else {
      // New device — register it
      const deviceSecret = crypto.randomBytes(32).toString('hex')
      const signed = signDeviceFingerprint(rawFingerprint, deviceSecret)
      const insert = await client.query(
        `INSERT INTO devices(user_id, device_fingerprint_hash, device_secret, platform, created_at, updated_at)
         VALUES($1,$2,$3,$4,now(),now()) RETURNING id`,
        [user.id, signed, deviceSecret, deviceInfo?.platform || null]
      )
      deviceId = insert.rows[0].id
      deviceSecretToReturn = deviceSecret
    }

    // Create session with refresh token rotation support
    const { accessToken, refreshToken, sessionId } = await createSession({
      userId: user.id,
      clinicId: user.clinic_id,
      deviceId: deviceId!,
      role: user.role as Role,
    })

    // Update last login
    await client.query(
      `UPDATE server_users SET last_login_at=now(), updated_at=now() WHERE id=$1`,
      [user.id]
    )

    // Audit successful login
    await writeAuditLog({
      action: 'login:success',
      user_id: user.id,
      clinic_id: user.clinic_id,
      resource: 'auth/login',
      status: 'SUCCESS',
      metadata: { deviceId, sessionId },
    })

    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      clinic_id: user.clinic_id,
    }

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken,
        sessionId,
        user: safeUser,
        deviceSecret: deviceSecretToReturn,
        deviceId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  } finally {
    client.release()
  }
}