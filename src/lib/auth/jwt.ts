import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { createHash, randomBytes } from 'crypto'
import type { AuthPayload, Role } from '@/types/auth'
import { getServerDb } from '@/lib/db/server/client'
import { sessions, revokedTokens } from '@/lib/db/server/schema'
import { eq, and, sql } from 'drizzle-orm'
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

  const hash = hashToken(token)

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

    // Check if token JTI has been revoked
    const jti = payload.jti as string | undefined
    if (jti) {
      const db = getServerDb()
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
  const db = getServerDb()
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

/**
 * Refresh token rotation:
 * 1. Verify the old refresh token
 * 2. Revoke the old refresh token
 * 3. Issue a new refresh token
 * 4. Issue a new access token
 * 
 * This prevents refresh token reuse — each refresh token can only be used once.
 */
export async function rotateRefreshToken(
  oldRefreshToken: string
): Promise<{
  accessToken: string
  refreshToken: string
  sessionId: string
} | null> {
  const db = getServerDb()

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
  const db = getServerDb()

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!session) return

  // Revoke the refresh token by its JTI (stored in access_token_jti or we use the hash)
  // Since we don't have the JTI stored, we revoke by marking session inactive
  // The refresh token hash is stored, but revokedTokens uses token_jti
  // We'll insert a revocation record using the session's refresh_token_hash as the JTI
  await db.insert(revokedTokens).values({
    id: uuidv4(),
    token_jti: session.refresh_token_hash,
    user_id: session.user_id,
    revoked_at: new Date(),
    reason: 'LOGOUT',
    expires_at: session.expires_at,
  })

  // Mark session as inactive
  await db
    .update(sessions)
    .set({
      is_active: false,
      updated_at: new Date(),
    })
    .where(eq(sessions.id, sessionId))
}

/**
 * Revoke a specific access token.
 * Used when a token needs to be invalidated before its natural expiry.
 */
export async function revokeAccessToken(token: string, reason: string = 'MANUAL'): Promise<void> {
  const db = getServerDb()
  const payload = await verifyToken(token)
  if (!payload) return

  const jti = payload.jti
  if (!jti) return

  await db.insert(revokedTokens).values({
    id: uuidv4(),
    token_jti: jti,
    user_id: payload.userId,
    revoked_at: new Date(),
    reason,
    expires_at: new Date(payload.exp! * 1000),
  })
}

/**
 * Invalidate all sessions for a user.
 * Used when password is changed or account is compromised.
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const db = getServerDb()

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

/**
 * Invalidate all sessions for a specific device.
 * Used when a device is unregistered.
 */
export async function invalidateDeviceSessions(
  userId: string,
  deviceId: string
): Promise<void> {
  const db = getServerDb()

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

/**
 * Validate that a session is still active.
 * Checks: not inactive, not expired, activity within max idle time.
 */
export async function validateSession(
  sessionId: string,
  maxIdleMs: number = 8 * 60 * 60 * 1000 // 8 hours default
): Promise<boolean> {
  const db = getServerDb()

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

// ─── Utility ─────────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Clean up expired revoked tokens.
 * Should be called periodically (e.g., daily cron).
 */
export async function cleanupExpiredRevokedTokens(): Promise<number> {
  const db = getServerDb()
  const result = await db
    .delete(revokedTokens)
    .where(sql`${revokedTokens.expires_at} < NOW()`)
  return result.rowCount || 0
}

/**
 * Clean up expired sessions.
 * Should be called periodically.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = getServerDb()
  const result = await db
    .delete(sessions)
    .where(sql`${sessions.expires_at} < NOW()`)
  return result.rowCount || 0
}