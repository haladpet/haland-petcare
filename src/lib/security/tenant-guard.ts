import { getServerDb } from '@/lib/db/server/client'
import { eq, and, sql } from 'drizzle-orm'
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core'

/**
 * Tenant Isolation Guard
 * 
 * Ensures every database query is scoped to the correct clinic.
 * This is the application-level defense against cross-tenant data leakage.
 * Database-level RLS provides the second layer of defense.
 */

export class TenantViolationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantViolationError'
  }
}

/**
 * Require that a clinic_id is present in query conditions.
 * Throws if clinic_id is missing — this prevents accidental cross-tenant queries.
 */
export function requireClinicScope(
  clinicId: string | null | undefined,
  context: string = 'unknown'
): asserts clinicId is string {
  if (!clinicId) {
    throw new TenantViolationError(
      `Missing clinic_id in query context: ${context}. All queries must be scoped to a clinic.`
    )
  }
}

/**
 * Enforce that the current user can only access data from their own clinic.
 * Returns the clinic_id if valid, throws otherwise.
 */
export function enforceTenantAccess(
  userClinicId: string | null | undefined,
  requestedClinicId: string | null | undefined,
  context: string = 'unknown'
): string {
  requireClinicScope(userClinicId, context)
  
  if (requestedClinicId && requestedClinicId !== userClinicId) {
    throw new TenantViolationError(
      `Cross-tenant access denied in ${context}: user clinic ${userClinicId} attempted to access clinic ${requestedClinicId}`
    )
  }
  
  return userClinicId
}

/**
 * Assert that a record belongs to the specified clinic.
 * Used when fetching a specific record to verify ownership.
 */
export function assertClinicOwnership(
  record: { clinic_id?: string | null } | null | undefined,
  expectedClinicId: string,
  entity: string = 'record'
): void {
  if (!record) {
    throw new TenantViolationError(`${entity} not found`)
  }
  
  if (!record.clinic_id) {
    throw new TenantViolationError(`${entity} has no clinic_id — cannot verify ownership`)
  }
  
  if (record.clinic_id !== expectedClinicId) {
    throw new TenantViolationError(
      `${entity} belongs to clinic ${record.clinic_id}, not clinic ${expectedClinicId}`
    )
  }
}

/**
 * Build a WHERE clause that includes clinic_id filter.
 * Use this in all repository queries to ensure tenant isolation.
 */
export function withClinicFilter(
  table: PgTable<TableConfig>,
  clinicId: string
) {
  requireClinicScope(clinicId, `withClinicFilter(${table})`)
  return eq(table.clinic_id, clinicId)
}

/**
 * Build a compound WHERE clause with clinic_id AND additional conditions.
 */
export function withClinicAndFilter(
  table: PgTable<TableConfig>,
  clinicId: string,
  ...additionalConditions: ReturnType<typeof eq>[]
) {
  requireClinicScope(clinicId, `withClinicAndFilter(${table})`)
  return and(eq(table.clinic_id, clinicId), ...additionalConditions)
}

/**
 * Validate that a user session has a valid clinic association.
 * Returns the clinic_id from the session.
 */
export function getClinicIdFromSession(session: {
  clinicId?: string | null
  clinic_id?: string | null
}): string {
  const clinicId = session.clinicId || session.clinic_id
  requireClinicScope(clinicId, 'session')
  return clinicId
}

/**
 * Create a tenant-scoped database query builder.
 * All queries through this builder automatically include the clinic_id filter.
 */
export function createTenantQuery(clinicId: string) {
  requireClinicScope(clinicId, 'createTenantQuery')
  
  return {
    clinicId,
    
    /**
     * Select records scoped to this clinic.
     */
    selectFrom: (table: PgTable<TableConfig>) => {
      const db = getServerDb()
      return {
        all: async () => {
          return db.select().from(table).where(eq(table.clinic_id, clinicId))
        },
        byId: async (id: string) => {
          const rows = await db.select().from(table).where(
            and(eq(table.clinic_id, clinicId), eq(table.id, id))
          ).limit(1)
          return rows[0] || null
        },
        where: async (condition: ReturnType<typeof eq>) => {
          return db.select().from(table).where(
            and(eq(table.clinic_id, clinicId), condition)
          )
        },
      }
    },
  }
}