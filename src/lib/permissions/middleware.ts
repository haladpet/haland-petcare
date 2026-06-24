import { verifyToken } from '@/lib/auth/jwt'
import { hasPermission } from '@/lib/permissions/matrix'
import { writeAuditLog } from '@/lib/db/server/audit'

type RouteHandler = (req: Request, ...rest: any[]) => Promise<Response>

export function withPermission(permission: string) {
  return (handler: RouteHandler): RouteHandler => {
    return async (req: Request, ...rest) => {
      const auth = req.headers.get('authorization') || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
      const payload = token ? await verifyToken(token) : null
      const userId = payload?.userId as string | undefined
      const clinicId = payload?.clinicId as string | undefined
      const role = (payload?.role as any) || 'CUSTOMER'

      const permitted = hasPermission(role, permission)
      await writeAuditLog({ action: permission, user_id: userId || null, clinic_id: clinicId || null, resource: req.url, status: permitted ? 'PERMITTED' : 'DENIED' })

      if (!permitted) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
      }

      return handler(req, ...rest)
    }
  }
}
