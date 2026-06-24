import { z } from 'zod'
import { rotateRefreshToken } from '@/lib/auth/jwt'
import { writeAuditLog } from '@/lib/db/server/audit'

const bodySchema = z.object({ refreshToken: z.string() })

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { refreshToken } = parsed.data

  // Use refresh token rotation — old token is revoked, new tokens issued
  const result = await rotateRefreshToken(refreshToken)

  if (!result) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired refresh token' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}