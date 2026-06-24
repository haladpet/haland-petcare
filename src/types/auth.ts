export type Role = 'OWNER' | 'DOCTOR' | 'STAFF' | 'CUSTOMER'

export interface AuthPayload {
  userId: string
  clinicId: string
  role: Role
  deviceId?: string
  iat?: number
  exp?: number
}
