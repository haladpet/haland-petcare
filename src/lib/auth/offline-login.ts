import { verifyToken } from './jwt'

export async function attemptOfflineLogin(email: string, deviceFingerprint: string) {
  if (typeof window === 'undefined') return false
  const storedToken = localStorage.getItem('auth:accessToken') || localStorage.getItem('auth:refreshToken')
  const lastActivity = Number(localStorage.getItem('auth:lastActivity') || '0')
  if (!storedToken) return false
  const payload = await verifyToken(storedToken).catch(() => null)
  if (!payload) return false

  const now = Date.now()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  const eightHours = 8 * 60 * 60 * 1000
  if (now - lastActivity > thirtyDays) return false
  if (now - lastActivity > eightHours) return false

  // optionally check email/deviceFingerprint against stored local data
  return true
}
