export type Role = 'OWNER' | 'DOCTOR' | 'STAFF' | 'CUSTOMER'

export interface AuthPayload {
  userId: string
  clinicId: string
  role: Role
  deviceId?: string
  sessionId?: string
  iat?: number
  exp?: number
}

export interface SessionRecord {
  id: string
  userId: string
  clinicId: string
  deviceId: string
  refreshTokenHash: string
  expiresAt: Date
  lastActivityAt: Date
  isRevoked: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RevokedToken {
  id: string
  tokenHash: string
  tokenType: 'ACCESS' | 'REFRESH'
  userId: string
  clinicId: string
  revokedAt: Date
  reason: string
  expiresAt: Date
}
