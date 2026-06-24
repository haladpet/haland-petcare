import { describe, it, expect } from 'vitest'
import { PERMISSION_MATRIX, hasPermission } from '@/lib/permissions/matrix'
import type { Role } from '@/types/auth'

describe('Permission Matrix', () => {
  describe('OWNER role', () => {
    const role: Role = 'OWNER'

    it('should have all permissions', () => {
      const perms = PERMISSION_MATRIX[role]
      expect(perms.user_management).toBe(true)
      expect(perms.queue_management).toBe(true)
      expect(perms.medical_records).toBe(true)
      expect(perms.prescriptions).toBe(true)
      expect(perms.hospitalization).toBe(true)
      expect(perms.inventory).toBe(true)
      expect(perms.pos_payment).toBe(true)
      expect(perms.reports).toBe(true)
      expect(perms.settings).toBe(true)
    })

    it('hasPermission should return true for all permissions', () => {
      expect(hasPermission(role, 'user_management')).toBe(true)
      expect(hasPermission(role, 'queue_management')).toBe(true)
      expect(hasPermission(role, 'medical_records')).toBe(true)
      expect(hasPermission(role, 'prescriptions')).toBe(true)
      expect(hasPermission(role, 'hospitalization')).toBe(true)
      expect(hasPermission(role, 'inventory')).toBe(true)
      expect(hasPermission(role, 'pos_payment')).toBe(true)
      expect(hasPermission(role, 'reports')).toBe(true)
      expect(hasPermission(role, 'settings')).toBe(true)
    })
  })

  describe('DOCTOR role', () => {
    const role: Role = 'DOCTOR'

    it('should have clinical permissions but not admin/financial', () => {
      expect(hasPermission(role, 'user_management')).toBe(false)
      expect(hasPermission(role, 'queue_management')).toBe(true)
      expect(hasPermission(role, 'medical_records')).toBe(true)
      expect(hasPermission(role, 'prescriptions')).toBe(true)
      expect(hasPermission(role, 'hospitalization')).toBe(true)
      expect(hasPermission(role, 'inventory')).toBe(false)
      expect(hasPermission(role, 'pos_payment')).toBe(false)
      expect(hasPermission(role, 'reports')).toBe(true)
      expect(hasPermission(role, 'settings')).toBe(false)
    })

    it('should NOT have access to user_management', () => {
      expect(hasPermission(role, 'user_management')).toBe(false)
    })

    it('should NOT have access to inventory', () => {
      expect(hasPermission(role, 'inventory')).toBe(false)
    })

    it('should NOT have access to pos_payment', () => {
      expect(hasPermission(role, 'pos_payment')).toBe(false)
    })

    it('should NOT have access to settings', () => {
      expect(hasPermission(role, 'settings')).toBe(false)
    })
  })

  describe('STAFF role', () => {
    const role: Role = 'STAFF'

    it('should have operational permissions but not clinical/admin', () => {
      expect(hasPermission(role, 'user_management')).toBe(false)
      expect(hasPermission(role, 'queue_management')).toBe(true)
      expect(hasPermission(role, 'medical_records')).toBe(false)
      expect(hasPermission(role, 'prescriptions')).toBe(false)
      expect(hasPermission(role, 'hospitalization')).toBe(true)
      expect(hasPermission(role, 'inventory')).toBe(true)
      expect(hasPermission(role, 'pos_payment')).toBe(true)
      expect(hasPermission(role, 'reports')).toBe(true)
      expect(hasPermission(role, 'settings')).toBe(false)
    })

    it('should NOT have access to medical_records', () => {
      expect(hasPermission(role, 'medical_records')).toBe(false)
    })

    it('should NOT have access to prescriptions', () => {
      expect(hasPermission(role, 'prescriptions')).toBe(false)
    })

    it('should have access to inventory and pos_payment', () => {
      expect(hasPermission(role, 'inventory')).toBe(true)
      expect(hasPermission(role, 'pos_payment')).toBe(true)
    })
  })

  describe('CUSTOMER role', () => {
    const role: Role = 'CUSTOMER'

    it('should have NO permissions at all', () => {
      expect(hasPermission(role, 'user_management')).toBe(false)
      expect(hasPermission(role, 'queue_management')).toBe(false)
      expect(hasPermission(role, 'medical_records')).toBe(false)
      expect(hasPermission(role, 'prescriptions')).toBe(false)
      expect(hasPermission(role, 'hospitalization')).toBe(false)
      expect(hasPermission(role, 'inventory')).toBe(false)
      expect(hasPermission(role, 'pos_payment')).toBe(false)
      expect(hasPermission(role, 'reports')).toBe(false)
      expect(hasPermission(role, 'settings')).toBe(false)
    })
  })

  describe('hasPermission edge cases', () => {
    it('should return false for unknown role', () => {
      expect(hasPermission('UNKNOWN' as Role, 'queue_management')).toBe(false)
    })

    it('should return false for unknown permission', () => {
      expect(hasPermission('OWNER', 'nonexistent_permission')).toBe(false)
    })
  })
})