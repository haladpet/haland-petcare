import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { AuthPayload } from '@/types/auth'

function getKey(secret?: string) {
  if (!secret) throw new Error('Missing JWT secret')
  return new TextEncoder().encode(secret)
}

export async function signAccessToken(payload: AuthPayload) {
  const secret = process.env.JWT_SECRET
  const key = getKey(secret)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 8 * 60 * 60 // 8 hours
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key)
  return token
}

export async function signRefreshToken(payload: AuthPayload) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
  const key = getKey(secret)
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 30 * 24 * 60 * 60 // 30 days
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key)
  return token
}

export async function verifyToken(token: string, opts?: { refresh?: boolean }) {
  try {
    const secret = opts?.refresh ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) : process.env.JWT_SECRET
    const key = getKey(secret)
    const { payload } = await jwtVerify(token, key)
    return payload as JWTPayload & AuthPayload
  } catch (err) {
    return null
  }
}
