import { withPermission } from '@/lib/permissions/middleware'

async function handler(req: Request) {
  return new Response(JSON.stringify({ ok: true, message: 'You have access' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export const GET = withPermission('user_management')(handler)
