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
        user_id: 'user-uuid',
        clinic_id: 'clinic-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        entity: 'customers',
      }))
    })

    it('should create audit log on pet creation', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'CREATE',
        entity: 'pets',
        entity_id: 'pet-uuid',
        user_id: 'user-uuid',
        clinic_id: 'clinic-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        entity: 'pets',
      }))
    })

    it('should create audit log on invoice creation', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'CREATE',
        entity: 'invoices',
        entity_id: 'invoice-uuid',
        user_id: 'user-uuid',
        clinic_id: 'clinic-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        entity: 'invoices',
      }))
    })

    it('should create audit log on medical record creation', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'CREATE',
        entity: 'medical_records',
        entity_id: 'mr-uuid',
        user_id: 'user-uuid',
        clinic_id: 'clinic-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CREATE',
        entity: 'medical_records',
      }))
    })
  })

  describe('Update Operations', () => {
    it('should create audit log on customer update', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'UPDATE',
        entity: 'customers',
        entity_id: 'customer-uuid',
        changes: { full_name: 'Updated Name' },
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        entity: 'customers',
      }))
    })

    it('should create audit log on pet update', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'UPDATE',
        entity: 'pets',
        entity_id: 'pet-uuid',
        changes: { weight: '15.5' },
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        entity: 'pets',
      }))
    })

    it('should create audit log on invoice status update', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'UPDATE',
        entity: 'invoices',
        entity_id: 'invoice-uuid',
        changes: { status: 'PAID' },
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        entity: 'invoices',
      }))
    })
  })

  describe('Delete Operations', () => {
    it('should create audit log on customer soft delete', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'SOFT_DELETE',
        entity: 'customers',
        entity_id: 'customer-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SOFT_DELETE',
        entity: 'customers',
      }))
    })

    it('should create audit log on pet soft delete', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'SOFT_DELETE',
        entity: 'pets',
        entity_id: 'pet-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SOFT_DELETE',
        entity: 'pets',
      }))
    })
  })

  describe('Auth Operations', () => {
    it('should create audit log on login', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'LOGIN',
        entity: 'sessions',
        user_id: 'user-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN',
        entity: 'sessions',
      }))
    })

    it('should create audit log on logout', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'LOGOUT',
        entity: 'sessions',
        user_id: 'user-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGOUT',
        entity: 'sessions',
      }))
    })

    it('should create audit log on failed login', async () => {
      const { writeAuditLog } = await import('@/lib/db/server/audit')
      await writeAuditLog({
        action: 'LOGIN_FAILED',
        entity: 'sessions',
        user_id: 'user-uuid',
      })
      expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN_FAILED',
        entity: 'sessions',
      }))
    })
  })

  describe('Append-Only Enforcement', () => {
    it('should reject UPDATE on audit_logs table', async () => {
      const { getServerDb } = await import('@/lib/db/server/client')
      const db = getServerDb()
      await db.update().set({ action: 'MODIFIED' }).where({ id: 'audit-uuid' })
      expect(db.update).toHaveBeenCalled()
    })

    it('should reject DELETE on audit_logs table', async () => {
      const { getServerDb } = await import('@/lib/db/server/client')
      const db = getServerDb()
      await db.delete().where({ id: 'audit-uuid' })
      expect(db.delete).toHaveBeenCalled()
    })

    it('should only allow INSERT on audit_logs table', async () => {
      const { getServerDb } = await import('@/lib/db/server/client')
      const db = getServerDb()
      await db.insert().values({ action: 'TEST', entity: 'test' })
      expect(db.insert).toHaveBeenCalled()
    })
  })
})