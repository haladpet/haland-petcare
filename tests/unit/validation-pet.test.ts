import { describe, it, expect } from 'vitest'
import { CreatePetSchema, UpdatePetSchema } from '@/lib/validation/pet'

describe('Pet Validation', () => {
  describe('CreatePetSchema', () => {
    const validPet = {
      name: 'Milo',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      clinic_id: '550e8400-e29b-41d4-a716-446655440001',
      species: 'DOG',
      breed: 'Golden Retriever',
      gender: 'MALE',
      date_of_birth: '2020-01-15',
      weight: 25.5,
      status: 'ACTIVE',
    }

    it('should accept valid pet data', () => {
      const result = CreatePetSchema.safeParse(validPet)
      expect(result.success).toBe(true)
    })

    it('should accept pet with only required fields', () => {
      const result = CreatePetSchema.safeParse({
        name: 'Bella',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        clinic_id: '550e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = CreatePetSchema.safeParse({
        ...validPet,
        name: '',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing name', () => {
      const { name, ...withoutName } = validPet
      const result = CreatePetSchema.safeParse(withoutName)
      expect(result.success).toBe(false)
    })

    it('should reject missing customer_id', () => {
      const { customer_id, ...withoutCustomer } = validPet
      const result = CreatePetSchema.safeParse(withoutCustomer)
      expect(result.success).toBe(false)
    })

    it('should reject invalid customer_id (not UUID)', () => {
      const result = CreatePetSchema.safeParse({
        ...validPet,
        customer_id: 'not-a-uuid',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid species values', () => {
      for (const species of ['DOG', 'CAT', 'BIRD', 'OTHER']) {
        const result = CreatePetSchema.safeParse({ ...validPet, species })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid species', () => {
      const result = CreatePetSchema.safeParse({
        ...validPet,
        species: 'FISH',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid gender values', () => {
      for (const gender of ['MALE', 'FEMALE', 'UNKNOWN']) {
        const result = CreatePetSchema.safeParse({ ...validPet, gender })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid gender', () => {
      const result = CreatePetSchema.safeParse({
        ...validPet,
        gender: 'OTHER',
      })
      expect(result.success).toBe(false)
    })

    it('should accept optional weight as number', () => {
      const result = CreatePetSchema.safeParse({
        ...validPet,
        weight: 12.3,
      })
      expect(result.success).toBe(true)
    })

    it('should reject weight as string', () => {
      const result = CreatePetSchema.safeParse({
        ...validPet,
        weight: 'heavy',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdatePetSchema', () => {
    it('should accept partial update with only name', () => {
      const result = UpdatePetSchema.safeParse({ name: 'Updated Name' })
      expect(result.success).toBe(true)
    })

    it('should accept partial update with only weight', () => {
      const result = UpdatePetSchema.safeParse({ weight: 15.5 })
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = UpdatePetSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept update with id', () => {
      const result = UpdatePetSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Name',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid species in partial update', () => {
      const result = UpdatePetSchema.safeParse({ species: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid gender in partial update', () => {
      const result = UpdatePetSchema.safeParse({ gender: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })
})