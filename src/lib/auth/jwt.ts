import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { AuthPayload, Role } from '@/types/auth'
import { v4 as uuidv4 } from 'uuid'

// ─── Configuration ───────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY = '15m' // Short-lived: 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days
const REFRESH_TOKEN_BYTES = 48 // 384-bit random refresh token

function getKey(secret?: string) {
  if (!secret) throw new Error('Missing JWT secret')
  return new TextEncoder().encode(secret)
}

function getRefreshSecret() {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
  if (!secret) throw new Error('Missing JWT refresh secret')
  return new TextEncoder().encode(secret)
}

// Lazy server-only helpers (avoids pulling pg into client bundles)
async function getServerOnlyDb() {
  const { getServerDb } = await import('@/lib/db/server/client')
  return getServerDb()
}

async function getServerSchema() {
  return await import('@/lib/db/server/schema')
}

async function getDrizzleOrm() {
  return await import('drizzle-orm')
}

// ─── Token Signing ───────────────────────────────────────────────

export async function signAccessToken(payload: AuthPayload): Promise<string> {
  const secret = process.env.JWT_SECRET
  const key = getKey(secret)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 15 * 60 // 15 minutes

  const token = await new SignJWT({
    userId: payload.userId,
    clinicId: payload.clinicId,
    role: payload.role,
    deviceId: payload.deviceId,
    sessionId: payload.sessionId,
    type: 'ACCESS',
  } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setJti(uuidv4())
    .sign(key)

  return token
}

export async function signRefreshToken(payload: AuthPayload): Promise<{
  token: string
  hash: string
}> {
  const secret = getRefreshSecret()
  const key = secret
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 7 * 24 * 60 * 60 // 7 days

  const token = await new SignJWT({
    userId: payload.userId,
    clinicId: payload.clinicId,
    role: payload.role,
    deviceId: payload.deviceId,
    sessionId: payload.sessionId,
    type: 'REFRESH',
  } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .setJti(uuidv4())
    .sign(key)

  const hash = await hashToken(token)

  return { token, hash }
}

// ─── Token Verification ──────────────────────────────────────────

export async function verifyToken(
  token: string,
  opts?: { refresh?: boolean }
): Promise<(JWTPayload & AuthPayload & { type?: string; jti?: string }) | null> {
  try {
    const secret = opts?.refresh
      ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET
    const key = getKey(secret)
    const { payload } = await jwtVerify(token, key)

    // Check if token JTI has been revoked (server-only)
    const jti = payload.jti as string | undefined
    if (jti && typeof window === 'undefined') {
      const { revokedTokens } = await getServerSchema()
      const { eq } = await getDrizzleOrm()
      const db = await getServerOnlyDb()
      const revoked = await db
        .select({ id: revokedTokens.id })
        .from(revokedTokens)
        .where(eq(revokedTokens.token_jti, jti))
        .limit(1)

      if (revoked.length > 0) {
        return null // Token has been revoked
      }
    }

    return payload as JWTPayload & AuthPayload & { type?: string; jti?: string }
  } catch {
    return null
  }
}

// ─── Session Management ──────────────────────────────────────────

export async function createSession(params: {
  userId: string
  clinicId: string
  deviceId: string
  role: Role
}): Promise<{
  accessToken: string
  refreshToken: string
  sessionId: string
}> {
  const db = await getServerOnlyDb()
  const { sessions } = await getServerSchema()

  const sessionId = uuidv4()

  // Create refresh token first
  const { token: refreshToken, hash: refreshHash } = await signRefreshToken({
    userId: params.userId,
    clinicId: params.clinicId,
    role: params.role,
    deviceId: params.deviceId,
    sessionId,
  })

  // Store session in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  await db.insert(sessions).values({
    id: sessionId,
    user_id: params.userId,
    device_id: params.deviceId,
    refresh_token_hash: refreshHash,
    expires_at: expiresAt,
    last_activity_at: new Date(),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  })

  // Create access token
  const accessToken = await signAccessToken({
    userId: params.userId,
    clinicId: params.clinicId,
    role: params.role,
    deviceId: params.deviceId,
    sessionId,
  })

  return { accessToken, refreshToken, sessionId }
}

export async function refreshSession(params: {
  sessionId: string
  newRefreshTokenHash: string
  newAccessTokenJti: string
  expiresAt: Date
}): Promise<void> {
  const db = await getServerOnlyDb()
  const { sessions } = await getServerSchema()
  const { eq } = await getDrizzleOrm()

  await db
    .update(sessions)
    .set({
      refresh_token_hash: params.newRefreshTokenHash,
      access_token_jti: params.newAccessTokenJti,
      expires_at: params.expiresAt,
      last_activity_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(sessions.id, params.sessionId))
}

export async function revokeSession(sessionId: string): Promise<void> {
  const db = await getServerOnlyDb()
  const { sessions } = await getServerSchema()
  const { eq } = await getDrizzleOrm()

  await db
    .update(sessions)
    .set({ is_active: false, updated_at: new Date() })
    .where(eq(sessions.id, sessionId))
}

// ─── Batch Session Operations ────────────────────────────────────

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const db = await getServerOnlyDb()
  const { sessions, revokedTokens } = await getServerSchema()
  const { and, eq } = await getDrizzleOrm()

  const userSessions = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.user_id, userId), eq(sessions.is_active, true)))

  for (const session of userSessions) {
    await db.insert(revokedTokens).values({
      id: uuidv4(),
      token_jti: session.refresh_token_hash,
      user_id: session.user_id,
      revoked_at: new Date(),
      reason: 'PASSWORD_CHANGE',
      expires_at: session.expires_at,
    })
  }

  await db
    .update(sessions)
    .set({ is_active: false, updated_at: new Date() })
    .where(and(eq(sessions.user_id, userId), eq(sessions.is_active, true)))
}

export async function invalidateDeviceSessions(
  userId: string,
  deviceId: string
): Promise<void> {
  const db = await getServerOnlyDb()
  const { sessions, revokedTokens } = await getServerSchema()
  const { and, eq } = await getDrizzleOrm()

  const deviceSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.user_id, userId),
        eq(sessions.device_id, deviceId),
        eq(sessions.is_active, true)
      )
    )

  for (const session of deviceSessions) {
    await db.insert(revokedTokens).values({
      id: uuidv4(),
      token_jti: session.refresh_token_hash,
      user_id: session.user_id,
      revoked_at: new Date(),
      reason: 'DEVICE_UNREGISTERED',
      expires_at: session.expires_at,
    })
  }

  await db
    .update(sessions)
    .set({ is_active: false, updated_at: new Date() })
    .where(
      and(
        eq(sessions.user_id, userId),
        eq(sessions.device_id, deviceId),
        eq(sessions.is_active, true)
      )
    )
}

export async function validateSession(
  sessionId: string,
  maxIdleMs: number = 8 * 60 * 60 * 1000 // 8 hours default
): Promise<boolean> {
  const db = await getServerOnlyDb()
  const { sessions } = await getServerSchema()
  const { eq } = await getDrizzleOrm()

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session) return false
  if (!session.is_active) return false
  if (new Date(session.expires_at) < new Date()) return false

  const idleTime = Date.now() - new Date(session.last_activity_at).getTime()
  if (idleTime > maxIdleMs) return false

  // Update last activity
  await db
    .update(sessions)
    .set({ last_activity_at: new Date(), updated_at: new Date() })
    .where(eq(sessions.id, sessionId))

  return true
}

// ─── Token Rotation ────────────────────────────────────────────

export async function rotateRefreshToken(
  oldRefreshToken: string
): Promise<{
  accessToken: string
  refreshToken: string
  sessionId: string
} | null> {
  const db = await getServerOnlyDb()
  const { sessions, revokedTokens } = await getServerSchema()
  const { eq } = await getDrizzleOrm()

  // Verify the old refresh token
  const payload = await verifyToken(oldRefreshToken, { refresh: true })
  if (!payload || payload.type !== 'REFRESH') {
    return null
  }

  const sessionId = payload.sessionId
  if (!sessionId) {
    return null
  }

  // Check session exists and is active
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session || !session.is_active) {
    return null
  }

  // Check session hasn't expired
  if (new Date(session.expires_at) < new Date()) {
    return null
  }

  // Revoke the old refresh token by its JTI
  const oldJti = payload.jti
  if (oldJti) {
    await db.insert(revokedTokens).values({
      id: uuidv4(),
      token_jti: oldJti,
      user_id: payload.userId,
      revoked_at: new Date(),
      reason: 'ROTATION',
      expires_at: new Date(payload.exp! * 1000),
    })
  }

  // Create new refresh token
  const { token: newRefreshToken, hash: newRefreshHash } = await signRefreshToken({
    userId: payload.userId,
    clinicId: payload.clinicId,
    role: payload.role as Role,
    deviceId: payload.deviceId,
    sessionId,
  })

  // Update session with new refresh token hash
  await db
    .update(sessions)
    .set({
      refresh_token_hash: newRefreshHash,
      last_activity_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(sessions.id, sessionId))

  // Create new access token
  const accessToken = await signAccessToken({
    userId: payload.userId,
    clinicId: payload.clinicId,
    role: payload.role as Role,
    deviceId: payload.deviceId,
    sessionId,
  })

  return { accessToken, refreshToken: newRefreshToken, sessionId }
}

/**
 * Invalidate a session — revokes the refresh token and marks session as inactive.
 * Called on logout.
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const db = await getServerOnlyDb()
  const { sessions, revokedTokens } = await getServerSchema()
  const { eq } = await getDrizzleOrm()

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (session) {
    await db.insert(revokedTokens).values({
      id: uuidv4(),
      token_jti: session.refresh_token_hash,
      user_id: session.user_id,
      revoked_at: new Date(),
      reason: 'LOGOUT',
      expires_at: session.expires_at,
    })

    await db
      .update(sessions)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(sessions.id, sessionId))
  }
}

// ─── Utility ─────────────────────────────────────────────────────

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function cleanupExpiredRevokedTokens(): Promise<number> {
  const db = await getServerOnlyDb()
  const { revokedTokens } = await getServerSchema()
  const { sql } = await getDrizzleOrm()
  const result = await db
    .delete(revokedTokens)
    .where(sql`${revokedTokens.expires_at} < NOW()`)
  return result.rowCount || 0
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getServerOnlyDb()
  const { sessions } = await getServerSchema()
  const { sql } = await getDrizzleOrm()
  const result = await db
    .delete(sessions)
    .where(sql`${sessions.expires_at} < NOW()`)
  return result.rowCount || 0
}
