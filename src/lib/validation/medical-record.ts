import { z } from 'zod'

const visitTypeEnum = ['ROUTINE_CHECKUP', 'VACCINATION', 'EMERGENCY', 'FOLLOW_UP', 'GROOMING', 'SURGERY', 'DENTAL', 'OTHER'] as const

export const CreateMedicalRecordSchema = z.object({
  clinic_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  pet_id: z.string().uuid(),
  queue_id: z.string().uuid().optional(),
  visit_date: z.string().datetime().or(z.string()),
  visit_type: z.enum(visitTypeEnum),
  // Physical Exam
  body_condition_score: z.number().int().min(1).max(9).optional(),
  temperature: z.number().optional(),
  heart_rate: z.number().int().optional(),
  respiratory_rate: z.number().int().optional(),
  weight: z.number().optional(),
  // Findings
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  // Additional fields
  chief_complaint: z.string().optional(),
  physical_exam_notes: z.string().optional(),
  lab_results: z.string().optional(),
  follow_up_date: z.string().optional(),
})

export const UpdateMedicalRecordSchema = CreateMedicalRecordSchema.partial().extend({
  id: z.string().uuid(),
})

export type CreateMedicalRecordInput = z.infer<typeof CreateMedicalRecordSchema>
export type UpdateMedicalRecordInput = z.infer<typeof UpdateMedicalRecordSchema>

export default CreateMedicalRecordSchema