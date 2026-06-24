import { verifyToken } from '@/lib/auth/jwt'
import { hasPermission } from '@/lib/permissions/matrix'
import { writeAuditLog } from '@/lib/db/server/audit'
import { requireClinicScope, enforceTenantAccess } from '@/lib/security/tenant-guard'
import type { Role } from '@/types/auth'

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string
    clinicId: string
    role: Role
    deviceId?: string
    sessionId?: string
  }
}

type RouteHandler = (req: AuthenticatedRequest, ...rest: any[]) => Promise<Response>

/**
 * Authorize a request — validates JWT, extracts auth context, and checks permissions.
 * This is the single entry point for all API authorization.
 * No API endpoint should bypass this.
 */
export async function authorize(req: Request): Promise<{
  userId: string
  clinicId: string
  role: Role
  deviceId?: string
  sessionId?: string
}> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth

  if (!token) {
    throw new AuthorizationError('Missing authorization token')
  }

  const payload = await verifyToken(token)
  if (!payload) {
    throw new AuthorizationError('Invalid or expired token')
  }

  const userId = payload.userId as string
  const clinicId = payload.clinicId as string
  const role = (payload.role as Role) || 'CUSTOMER'
  const deviceId = payload.deviceId as string | undefined
  const sessionId = payload.sessionId as string | undefined

  if (!userId) {
    throw new AuthorizationError('Token missing user identity')
  }

  requireClinicScope(clinicId, `authorize(${req.url})`)

  return { userId, clinicId, role, deviceId, sessionId }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Higher-order wrapper that enforces RBAC permission check.
 * 
 * Usage:
 *   export const POST = withPermission('medical_records')(async (req) => { ... })
 * 
 * The handler receives an AuthenticatedRequest with auth context attached.
 */
export function withPermission(permission: string) {
  return (handler: RouteHandler): ((req: Request, ...rest: any[]) => Promise<Response>) => {
    return async (req: Request, ...rest) => {
      try {
        const auth = await authorize(req)
        const { userId, clinicId, role, deviceId, sessionId } = auth

        const permitted = hasPermission(role, permission)

        // Audit every authorization decision
        await writeAuditLog({
          action: `authorize:${permission}`,
          user_id: userId,
          clinic_id: clinicId,
          resource: req.url,
          status: permitted ? 'PERMITTED' : 'DENIED',
        })

        if (!permitted) {
          return new Response(
            JSON.stringify({
              error: 'Forbidden',
              message: `Role ${role} does not have permission: ${permission}`,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        // Attach auth context to request
        const authenticatedReq = req as AuthenticatedRequest
        authenticatedReq.auth = { userId, clinicId, role, deviceId, sessionId }

        return handler(authenticatedReq, ...rest)
      } catch (err) {
        if (err instanceof AuthorizationError) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized', message: err.message }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        throw err
      }
    }
  }
}

/**
 * Require a specific role (or higher) for an endpoint.
 * More restrictive than withPermission — checks exact role match.
 */
export function withRole(...allowedRoles: Role[]) {
  return (handler: RouteHandler): ((req: Request, ...rest: any[]) => Promise<Response>) => {
    return async (req: Request, ...rest) => {
      try {
        const auth = await authorize(req)
        const { userId, clinicId, role, deviceId, sessionId } = auth

        if (!allowedRoles.includes(role)) {
          await writeAuditLog({
            action: `authorize:role_check`,
            user_id: userId,
            clinic_id: clinicId,
            resource: req.url,
            status: 'DENIED',
          })

          return new Response(
            JSON.stringify({
              error: 'Forbidden',
              message: `Role ${role} not in allowed roles: ${allowedRoles.join(', ')}`,
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        const authenticatedReq = req as AuthenticatedRequest
        authenticatedReq.auth = { userId, clinicId, role, deviceId, sessionId }

        return handler(authenticatedReq, ...rest)
      } catch (err) {
        if (err instanceof AuthorizationError) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized', message: err.message }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        throw err
      }
    }
  }
}
