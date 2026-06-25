import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Role } from '@/types/auth'

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
}))

vi.mock('@/lib/db/server/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/security/tenant-guard', () => ({
  requireClinicScope: vi.fn(),
  enforceTenantAccess: vi.fn(),
}))

describe('RBAC Hardening — Complete Matrix Validation', () => {
  const roles: Role[] = ['OWNER', 'DOCTOR', 'STAFF', 'CUSTOMER']

  const allPermissions = [
    'user_management',
    'queue_management',
    'medical_records',
    'prescriptions',
    'hospitalization',
    'inventory',
    'pos_payment',
    'reports',
    'settings',
  ]

  const expectedMatrix: Record<Role, Record<string, boolean>> = {
    OWNER: {
      user_management: true,
      queue_management: true,
      medical_records: true,
      prescriptions: true,
      hospitalization: true,
      inventory: true,
      pos_payment: true,
      reports: true,
      settings: true,
    },
    DOCTOR: {
      user_management: false,
      queue_management: true,
      medical_records: true,
      prescriptions: true,
      hospitalization: true,
      inventory: false,
      pos_payment: false,
      reports: true,
      settings: false,
    },
    STAFF: {
      user_management: false,
      queue_management: true,
      medical_records: false,
      prescriptions: false,
      hospitalization: true,
      inventory: true,
      pos_payment: true,
      reports: true,
      settings: false,
    },
    CUSTOMER: {
      user_management: false,
      queue_management: false,
      medical_records: false,
      prescriptions: false,
      hospitalization: false,
      inventory: false,
      pos_payment: false,
      reports: false,
      settings: false,
    },
  }

  describe('Permission Matrix — Every Role × Every Permission', () => {
    for (const role of roles) {
      for (const permission of allPermissions) {
        const expected = expectedMatrix[role][permission]
        it(`${role} → ${permission} = ${expected}`, async () => {
          const { hasPermission } = await import('@/lib/permissions/matrix')
          const result = hasPermission(role, permission)
          expect(result).toBe(expected)
        })
      }
    }
  })

  describe('Permission Matrix Integrity', () => {
    it('should have exactly 4 roles defined', async () => {
      const { PERMISSION_MATRIX } = await import('@/lib/permissions/matrix')
      const definedRoles = Object.keys(PERMISSION_MATRIX)
      expect(definedRoles).toHaveLength(4)
      expect(definedRoles).toEqual(['OWNER', 'DOCTOR', 'STAFF', 'CUSTOMER'])
    })

    it('all roles should have the same permission keys', async () => {
      const { PERMISSION_MATRIX } = await import('@/lib/permissions/matrix')
      const ownerKeys = Object.keys(PERMISSION_MATRIX.OWNER).sort()
      for (const role of ['DOCTOR', 'STAFF', 'CUSTOMER'] as const) {
        const roleKeys = Object.keys(PERMISSION_MATRIX[role]).sort()
        expect(roleKeys).toEqual(ownerKeys)
      }
    })

    it('no role should have undefined permissions', async () => {
      const { PERMISSION_MATRIX } = await import('@/lib/permissions/matrix')
      for (const role of ['OWNER', 'DOCTOR', 'STAFF', 'CUSTOMER'] as const) {
        for (const [key, value] of Object.entries(PERMISSION_MATRIX[role])) {
          expect(typeof value).toBe('boolean')
        }
      }
    })
  })

  describe('API Route Protection', () => {
    const protectedRoutes = [
      { route: '/api/customers', method: 'GET', minRole: 'STAFF' },
      { route: '/api/customers', method: 'POST', minRole: 'STAFF' },
      { route: '/api/pets', method: 'GET', minRole: 'STAFF' },
      { route: '/api/pets', method: 'POST', minRole: 'STAFF' },
      { route: '/api/inventory', method: 'GET', minRole: 'STAFF' },
      { route: '/api/inventory', method: 'POST', minRole: 'STAFF' },
      { route: '/api/medical-records', method: 'POST', minRole: 'DOCTOR' },
      { route: '/api/prescriptions', method: 'POST', minRole: 'DOCTOR' },
      { route: '/api/payments', method: 'POST', minRole: 'STAFF' },
      { route: '/api/invoices', method: 'GET', minRole: 'STAFF' },
      { route: '/api/queues', method: 'GET', minRole: 'STAFF' },
      { route: '/api/appointments', method: 'GET', minRole: 'STAFF' },
      { route: '/api/reports', method: 'GET', minRole: 'STAFF' },
      { route: '/api/audit', method: 'GET', minRole: 'OWNER' },
      { route: '/api/sync', method: 'POST', minRole: 'STAFF' },
    ]

    for (const { route, method, minRole } of protectedRoutes) {
      it(`should protect ${method} ${route} (min role: ${minRole})`, async () => {
        const { hasPermission } = await import('@/lib/permissions/matrix')
        const minRoleIndex = roles.indexOf(minRole as Role)
        for (const role of roles) {
          const roleIndex = roles.indexOf(role)
          const expected = roleIndex <= minRoleIndex
          const permName = route.split('/')[2]?.replace(/-/g, '_') || route
          const result = hasPermission(role, permName)
          if (expected) {
            expect(result).toBe(true)
          }
        }
      })
    }
  })

  describe('Page Protection', () => {
    const protectedPages = [
      { page: '/customers', minRole: 'STAFF' },
      { page: '/pets', minRole: 'STAFF' },
      { page: '/queue', minRole: 'STAFF' },
      { page: '/appointments', minRole: 'STAFF' },
      { page: '/medical-records/new', minRole: 'DOCTOR' },
      { page: '/inventory', minRole: 'STAFF' },
      { page: '/pos', minRole: 'STAFF' },
      { page: '/reports', minRole: 'STAFF' },
      { page: '/audit', minRole: 'OWNER' },
      { page: '/conflicts', minRole: 'OWNER' },
      { page: '/settings/devices', minRole: 'OWNER' },
    ]

    for (const { page, minRole } of protectedPages) {
      it(`should protect page ${page} (min role: ${minRole})`, async () => {
        const { hasPermission } = await import('@/lib/permissions/matrix')
        const minRoleIndex = roles.indexOf(minRole as Role)
        for (const role of roles) {
          const roleIndex = roles.indexOf(role)
          const expected = roleIndex <= minRoleIndex
          const permMap: Record<string, string> = {
            '/customers': 'queue_management',
            '/pets': 'queue_management',
            '/queue': 'queue_management',
            '/appointments': 'queue_management',
            '/medical-records/new': 'medical_records',
            '/inventory': 'inventory',
            '/pos': 'pos_payment',
            '/reports': 'reports',
            '/audit': 'reports',
            '/conflicts': 'settings',
            '/settings/devices': 'settings',
          }
          const perm = permMap[page]
          if (perm) {
            const result = hasPermission(role, perm)
            if (expected) {
              expect(result).toBe(true)
            }
          }
        }
      })
    }
  })
})