import { z } from 'zod'
import { verifyToken, signAccessToken } from '@/lib/auth/jwt'

const bodySchema = z.object({ refreshToken: z.string() })

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 })
  const { refreshToken } = parsed.data
  const payload = await verifyToken(refreshToken, { refresh: true })
  if (!payload) return new Response(JSON.stringify({ error: 'Invalid refresh token' }), { status: 401 })
  const accessToken = await signAccessToken({ userId: payload.userId, clinicId: payload.clinicId, role: payload.role, deviceId: payload.deviceId })
  return new Response(JSON.stringify({ accessToken }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
