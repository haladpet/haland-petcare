import type { Role } from '@/types/auth'

export const PERMISSION_MATRIX: Record<Role, Record<string, boolean>> = {
  OWNER: {
    user_management: true,
    queue_management: true,
    medical_records: true,
    prescriptions: true,
    hospitalization: true,
    inventory: true,
    pos_payment: true,
    reports: true,
    settings: true,
  },
  DOCTOR: {
    user_management: false,
    queue_management: true,
    medical_records: true,
    prescriptions: true,
    hospitalization: true,
    inventory: false,
    pos_payment: false,
    reports: true,
    settings: false,
  },
  STAFF: {
    user_management: false,
    queue_management: true,
    medical_records: false,
    prescriptions: false,
    hospitalization: true,
    inventory: true,
    pos_payment: true,
    reports: true,
    settings: false,
  },
  CUSTOMER: {
    user_management: false,
    queue_management: false,
    medical_records: false,
    prescriptions: false,
    hospitalization: false,
    inventory: false,
    pos_payment: false,
    reports: false,
    settings: false,
  },
}

export function hasPermission(role: Role, permission: string): boolean {
  const rolePerms = PERMISSION_MATRIX[role]
  if (!rolePerms) return false
  return Boolean(rolePerms[permission])
}