import { describe, it, expect } from 'vitest'
import { CreateCustomerSchema, UpdateCustomerSchema } from '@/lib/validation/customer'

describe('Customer Validation', () => {
  describe('CreateCustomerSchema', () => {
    const validCustomer = {
      full_name: 'John Doe',
      phone: '081234567890',
      email: 'john@example.com',
      address: 'Jl. Merdeka No. 1',
      notes: 'Pelanggan tetap',
      clinic_id: '550e8400-e29b-41d4-a716-446655440000',
    }

    it('should accept valid customer data', () => {
      const result = CreateCustomerSchema.safeParse(validCustomer)
      expect(result.success).toBe(true)
    })

    it('should accept customer without optional fields', () => {
      const result = CreateCustomerSchema.safeParse({
        full_name: 'Jane Doe',
        phone: '081234567891',
        clinic_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty full_name', () => {
      const result = CreateCustomerSchema.safeParse({
        ...validCustomer,
        full_name: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing full_name', () => {
      const { full_name, ...withoutName } = validCustomer
      const result = CreateCustomerSchema.safeParse(withoutName)
      expect(result.success).toBe(false)
    })

    it('should reject invalid phone format', () => {
      const result = CreateCustomerSchema.safeParse({
        ...validCustomer,
        phone: '12345',
      })
      expect(result.success).toBe(false)
    })

    it('should accept phone with +62 prefix', () => {
      const result = CreateCustomerSchema.safeParse({
        ...validCustomer,
        phone: '+6281234567890',
      })
      expect(result.success).toBe(true)
    })

    it('should accept phone with 62 prefix', () => {
      const result = CreateCustomerSchema.safeParse({
        ...validCustomer,
        phone: '6281234567890',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = CreateCustomerSchema.safeParse({
        ...validCustomer,
        email: 'not-an-email',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing clinic_id', () => {
      const { clinic_id, ...withoutClinic } = validCustomer
      const result = CreateCustomerSchema.safeParse(withoutClinic)
      expect(result.success).toBe(false)
    })

    it('should reject invalid clinic_id (not UUID)', () => {
      const result = CreateCustomerSchema.safeParse({
        ...validCustomer,
        clinic_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateCustomerSchema', () => {
    it('should accept partial update with only full_name', () => {
      const result = UpdateCustomerSchema.safeParse({
        full_name: 'Updated Name',
      })
      expect(result.success).toBe(true)
    })

    it('should accept partial update with only phone', () => {
      const result = UpdateCustomerSchema.safeParse({
        phone: '081234567890',
      })
      expect(result.success).toBe(true)
    })

    it('should accept empty object (no fields to update)', () => {
      const result = UpdateCustomerSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept update with id', () => {
      const result = UpdateCustomerSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        full_name: 'Updated Name',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid phone in partial update', () => {
      const result = UpdateCustomerSchema.safeParse({
        phone: 'invalid',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid email in partial update', () => {
      const result = UpdateCustomerSchema.safeParse({
        email: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })
})