import { z } from 'zod'

const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/

export const CreateCustomerSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().regex(phoneRegex),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  clinic_id: z.string().uuid(),
})

export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({ id: z.string().uuid().optional() })

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>

export default CreateCustomerSchema
