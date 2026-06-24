import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('Password Hashing', () => {
  it('should hash a password and return a string', async () => {
    const hash = await hashPassword('testPassword123')
    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('should produce different hashes for the same password (salt)', async () => {
    const hash1 = await hashPassword('samePassword')
    const hash2 = await hashPassword('samePassword')
    expect(hash1).not.toBe(hash2)
  })

  it('should verify a correct password', async () => {
    const password = 'mySecurePassword'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('should reject an incorrect password', async () => {
    const hash = await hashPassword('correctPassword')
    const isValid = await verifyPassword('wrongPassword', hash)
    expect(isValid).toBe(false)
  })

  it('should handle empty password', async () => {
    const hash = await hashPassword('')
    expect(hash).toBeDefined()
    const isValid = await verifyPassword('', hash)
    expect(isValid).toBe(true)
  })

  it('should handle special characters in password', async () => {
    const password = 'p@ssw0rd!@#$%^&*()_+-=[]{}|;:,.<>?'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('should handle unicode characters in password', async () => {
    const password = 'パスワード🔒'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('should handle very long passwords', async () => {
    const password = 'a'.repeat(1000)
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })
})