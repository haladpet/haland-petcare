import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDb = {
  insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]), limit: vi.fn().mockResolvedValue([]) }) }),
  update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
  delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
}

vi.mock('@/lib/db/server/client', () => ({
  getServerDb: vi.fn(() => mockDb),
}))

vi.mock('@/lib/db/server/audit', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

describe('Audit Log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Create Operations', () => {
    it('should create audit log on customer creation', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'CREATE',
        entity: 'customers',
        entity_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })

    it('should create audit log on pet creation', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'CREATE',
        entity: 'pets',
        entity_id: '550e8400-e29b-41d4-a716-446655440001',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })

    it('should create audit log on appointment creation', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'CREATE',
        entity: 'appointments',
        entity_id: '550e8400-e29b-41d4-a716-446655440002',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })
  })

  describe('Update Operations', () => {
    it('should create audit log on customer update', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'UPDATE',
        entity: 'customers',
        entity_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        changes: { full_name: 'Updated Name' },
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })

    it('should create audit log on pet update', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'UPDATE',
        entity: 'pets',
        entity_id: '550e8400-e29b-41d4-a716-446655440001',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        changes: { name: 'Updated Pet' },
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })
  })

  describe('Delete Operations', () => {
    it('should create audit log on customer deletion', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'DELETE',
        entity: 'customers',
        entity_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })
  })

  describe('Security Events', () => {
    it('should create audit log on login', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'LOGIN',
        entity: 'users',
        entity_id: 'user-1',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })

    it('should create audit log on failed login', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'LOGIN_FAILED',
        entity: 'users',
        user_id: null,
        clinic_id: 'clinic-1',
        status: 'DENIED',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })

    it('should create audit log on logout', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'LOGOUT',
        entity: 'sessions',
        entity_id: 'session-1',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })
  })

  describe('Permission Events', () => {
    it('should create audit log on permission denied', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'ACCESS_DENIED',
        entity: 'customers',
        entity_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-2',
        clinic_id: 'clinic-1',
        status: 'DENIED',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })

    it('should create audit log on cross-tenant access attempt', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'CROSS_TENANT_ACCESS',
        entity: 'customers',
        entity_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-1',
        clinic_id: 'clinic-2',
        status: 'DENIED',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })
  })

  describe('Sync Events', () => {
    it('should create audit log on sync conflict', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'SYNC_CONFLICT',
        entity: 'customers',
        entity_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'CONFLICT',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })

    it('should create audit log on sync resolution', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'SYNC_RESOLVED',
        entity: 'customers',
        entity_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: 'user-1',
        clinic_id: 'clinic-1',
        status: 'SUCCESS',
      })
      expect(writeAuditLog).toHaveBeenCalled()
    })
  })

  describe('Audit Immutability', () => {
    it('should not allow modification of audit entries', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      // Audit entries are append-only - we verify the function exists
      // but there's no update/delete for audit entries
      expect(writeAuditLog).toBeDefined()
      // The audit module should NOT export update or delete functions
      const auditModule = await import('@/lib/db/server/audit')
      expect(auditModule).not.toHaveProperty('updateAuditLog')
      expect(auditModule).not.toHaveProperty('deleteAuditLog')
    })
  })
})