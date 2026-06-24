import { z } from 'zod'

const speciesEnum = ['DOG', 'CAT', 'BIRD', 'OTHER'] as const
const ageUnitEnum = ['YEARS', 'MONTHS'] as const
const genderEnum = ['MALE', 'FEMALE', 'UNKNOWN'] as const

export const CreatePetSchema = z.object({
  name: z.string().min(1),
  customer_id: z.string().uuid(),
  clinic_id: z.string().uuid(),
  species: z.enum(speciesEnum).optional(),
  breed: z.string().optional(),
  gender: z.enum(genderEnum).optional(),
  date_of_birth: z.string().optional(),
  weight: z.number().optional(),
  status: z.string().optional(),
})

export const UpdatePetSchema = CreatePetSchema.partial().extend({ id: z.string().uuid().optional() })

export type CreatePetInput = z.infer<typeof CreatePetSchema>
export type UpdatePetInput = z.infer<typeof UpdatePetSchema>

export default CreatePetSchema
