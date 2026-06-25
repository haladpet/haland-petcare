import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasPermission, PERMISSION_MATRIX } from '@/lib/permissions/matrix'
import type { Role } from '@/types/auth'

// Mock the JWT verification and audit log to test authorization logic in isolation
vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: vi.fn(),
}))

vi.mock('@/lib/db/server/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/security/tenant-guard', () => ({
  requireClinicScope: vi.fn(),
  enforceTenantAccess: vi.fn(),
}))

describe('Authorization Integration', () => {
  describe('Role-Based Access Control — All Roles × All Permissions', () => {
    const permissions = [
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

    const roles: Role[] = ['OWNER', 'DOCTOR', 'STAFF', 'CUSTOMER']

    it('OWNER should have access to ALL permissions', () => {
      for (const perm of permissions) {
        expect(hasPermission('OWNER', perm)).toBe(true)
      }
    })

    it('DOCTOR should have access to clinical + queue + reports only', () => {
      const doctorAllowed = ['queue_management', 'medical_records', 'prescriptions', 'hospitalization', 'reports']
      const doctorDenied = ['user_management', 'inventory', 'pos_payment', 'settings']

      for (const perm of doctorAllowed) {
        expect(hasPermission('DOCTOR', perm)).toBe(true)
      }
      for (const perm of doctorDenied) {
        expect(hasPermission('DOCTOR', perm)).toBe(false)
      }
    })

    it('STAFF should have access to operational + reports only', () => {
      const staffAllowed = ['queue_management', 'hospitalization', 'inventory', 'pos_payment', 'reports']
      const staffDenied = ['user_management', 'medical_records', 'prescriptions', 'settings']

      for (const perm of staffAllowed) {
        expect(hasPermission('STAFF', perm)).toBe(true)
      }
      for (const perm of staffDenied) {
        expect(hasPermission('STAFF', perm)).toBe(false)
      }
    })

    it('CUSTOMER should have NO access to any permission', () => {
      for (const perm of permissions) {
        expect(hasPermission('CUSTOMER', perm)).toBe(false)
      }
    })
  })

  describe('Cross-role boundary enforcement', () => {
    it('DOCTOR cannot access user_management (admin boundary)', () => {
      expect(hasPermission('DOCTOR', 'user_management')).toBe(false)
    })

    it('DOCTOR cannot access inventory (financial boundary)', () => {
      expect(hasPermission('DOCTOR', 'inventory')).toBe(false)
    })

    it('DOCTOR cannot access pos_payment (financial boundary)', () => {
      expect(hasPermission('DOCTOR', 'pos_payment')).toBe(false)
    })

    it('STAFF cannot access medical_records (clinical boundary)', () => {
      expect(hasPermission('STAFF', 'medical_records')).toBe(false)
    })

    it('STAFF cannot access prescriptions (clinical boundary)', () => {
      expect(hasPermission('STAFF', 'prescriptions')).toBe(false)
    })

    it('STAFF cannot access settings (admin boundary)', () => {
      expect(hasPermission('STAFF', 'settings')).toBe(false)
    })

    it('CUSTOMER cannot access anything (full boundary)', () => {
      const allPerms = Object.keys(PERMISSION_MATRIX.CUSTOMER)
      for (const perm of allPerms) {
        expect(hasPermission('CUSTOMER', perm)).toBe(false)
      }
    })
  })

  describe('Permission matrix integrity', () => {
    it('should have exactly 4 roles defined', () => {
      const definedRoles = Object.keys(PERMISSION_MATRIX)
      expect(definedRoles).toHaveLength(4)
      expect(definedRoles).toContain('OWNER')
      expect(definedRoles).toContain('DOCTOR')
      expect(definedRoles).toContain('STAFF')
      expect(definedRoles).toContain('CUSTOMER')
    })

    it('all roles should have the same permission keys', () => {
      const ownerKeys = Object.keys(PERMISSION_MATRIX.OWNER).sort()
      for (const role of ['DOCTOR', 'STAFF', 'CUSTOMER'] as const) {
        const roleKeys = Object.keys(PERMISSION_MATRIX[role]).sort()
        expect(roleKeys).toEqual(ownerKeys)
      }
    })

    it('no role should have undefined permissions', () => {
      for (const role of ['OWNER', 'DOCTOR', 'STAFF', 'CUSTOMER'] as const) {
        for (const [key, value] of Object.entries(PERMISSION_MATRIX[role])) {
          expect(typeof value).toBe('boolean')
        }
      }
    })
  })
})