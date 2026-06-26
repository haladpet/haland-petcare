import { getServerDb } from './client'
import { auditLogs } from './schema'
import { eq, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ───────────────────────────────────────────────────────

export interface AuditEntry {
  action: string
  user_id?: string | null
  clinic_id?: string | null
  entity?: string | null
  entity_id?: string | null
  changes?: unknown
  details?: unknown
  resource?: string | null
  status?: 'PERMITTED' | 'DENIED' | 'SUCCESS' | 'CONFLICT' | 'PARTIAL' | 'INFO'
  metadata?: unknown
  ip_address?: string | null
}

// ─── Retry Configuration ─────────────────────────────────────────
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const DEAD_LETTER_THRESHOLD = 100

// In-memory retry queue for failed audit entries
interface FailedAuditEntry {
  entry: AuditEntry
  retries: number
  lastError: string
  firstAttemptAt: Date
}

const retryQueue: FailedAuditEntry[] = []
const deadLetterQueue: FailedAuditEntry[] = []
let retryTimer: ReturnType<typeof setInterval> | null = null

// ─── Core Audit Function ─────────────────────────────────────────

/**
 * Write an immutable audit log entry.
 * 
 * Audit entries are append-only and cannot be modified or deleted
 * through normal application pathways.
 * 
 * If the write fails, the entry is placed in a retry queue.
 * After MAX_RETRIES, it moves to the dead letter queue.
 * 
 * NEVER silently drops audit entries.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const db = getServerDb()

    await db.insert(auditLogs).values({
      id: uuidv4(),
      user_id: entry.user_id || null,
      clinic_id: entry.clinic_id || null,
      action: entry.action,
      entity: entry.entity || null,
      entity_id: entry.entity_id || null,
      changes: entry.changes || entry.details
        ? JSON.stringify(entry.changes || entry.details)
        : null,
      ip_address: entry.ip_address || null,
      created_at: new Date(),
    })

    // Success — check if we can drain the retry queue
    drainRetryQueue()
  } catch (err: unknown) {
    // Audit write failed — queue for retry
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[Audit] Write failed for action "${entry.action}": ${errorMessage}`)

    retryQueue.push({
      entry,
      retries: 0,
      lastError: errorMessage,
      firstAttemptAt: new Date(),
    })

    // Start retry timer if not already running
    if (!retryTimer) {
      startRetryTimer()
    }

    // If retry queue is too large, move oldest to dead letter
    if (retryQueue.length > DEAD_LETTER_THRESHOLD) {
      const oldest = retryQueue.shift()!
      deadLetterQueue.push(oldest)
      console.error(`[Audit] Dead letter: action "${oldest.entry.action}" after ${DEAD_LETTER_THRESHOLD} queue overflow`)
    }
  }
}

// ─── Retry Queue Management ──────────────────────────────────────

function startRetryTimer() {
  retryTimer = setInterval(() => {
    drainRetryQueue()
  }, RETRY_DELAY_MS * 2)
}

async function drainRetryQueue() {
  if (retryQueue.length === 0) {
    if (retryTimer) {
      clearInterval(retryTimer)
      retryTimer = null
    }
    return
  }

  const db = getServerDb()
  const toRetry = [...retryQueue]
  retryQueue.length = 0

  for (const failed of toRetry) {
    try {
      await db.insert(auditLogs).values({
        id: uuidv4(),
        user_id: failed.entry.user_id || null,
        clinic_id: failed.entry.clinic_id || null,
        action: failed.entry.action,
        entity: failed.entry.entity || null,
        entity_id: failed.entry.entity_id || null,
        changes: failed.entry.changes || failed.entry.details
          ? JSON.stringify(failed.entry.changes || failed.entry.details)
          : null,
        ip_address: failed.entry.ip_address || null,
        created_at: new Date(),
      })
      // Successfully retried
    } catch (err: unknown) {
      failed.retries++
      failed.lastError = err instanceof Error ? err.message : String(err)

      if (failed.retries >= MAX_RETRIES) {
        // Move to dead letter queue
        deadLetterQueue.push(failed)
        console.error(
          `[Audit] Dead letter after ${MAX_RETRIES} retries: action "${failed.entry.action}" — ${failed.lastError}`
        )
      } else {
        // Put back in retry queue
        retryQueue.push(failed)
      }
    }
  }
}

// ─── Dead Letter Queue ───────────────────────────────────────────

/**
 * Get all entries in the dead letter queue.
 * These are audit entries that failed after all retries.
 * Should be monitored and manually investigated.
 */
export function getDeadLetterQueue(): FailedAuditEntry[] {
  return [...deadLetterQueue]
}

/**
 * Get current retry queue status.
 */
export function getRetryQueueStatus(): {
  retryCount: number
  deadLetterCount: number
  oldestRetryMs: number | null
} {
  const oldestRetry = retryQueue[0]
  return {
    retryCount: retryQueue.length,
    deadLetterCount: deadLetterQueue.length,
    oldestRetryMs: oldestRetry
      ? Date.now() - oldestRetry.firstAttemptAt.getTime()
      : null,
  }
}

/**
 * Attempt to reprocess dead letter queue entries.
 * Called when the system recovers from an outage.
 */
export async function reprocessDeadLetters(): Promise<{
  succeeded: number
  failed: number
}> {
  const db = getServerDb()
  let succeeded = 0
  let failed = 0

  const toReprocess = [...deadLetterQueue]
  deadLetterQueue.length = 0

  for (const entry of toReprocess) {
    try {
      await db.insert(auditLogs).values({
        id: uuidv4(),
        user_id: entry.entry.user_id || null,
        clinic_id: entry.entry.clinic_id || null,
        action: entry.entry.action,
        entity: entry.entry.entity || null,
        entity_id: entry.entry.entity_id || null,
        changes: entry.entry.changes || entry.entry.details
          ? JSON.stringify(entry.entry.changes || entry.entry.details)
          : null,
        ip_address: entry.entry.ip_address || null,
        created_at: new Date(),
      })
      succeeded++
    } catch {
      deadLetterQueue.push(entry)
      failed++
    }
  }

  return { succeeded, failed }
}

// ─── Audit Query Helpers ─────────────────────────────────────────

/**
 * Query audit logs with filters.
 * Used by the Audit Explorer dashboard.
 */
export async function queryAuditLogs(params: {
  clinicId: string
  userId?: string
  role?: string
  entity?: string
  action?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{ logs: unknown[]; total: number }> {
  const db = getServerDb()
  const limit = Math.min(params.limit || 50, 200)
  const offset = params.offset || 0

  let query = db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.clinic_id, params.clinicId))

  // Build count query with same filters
  let countQuery = db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(auditLogs)
    .where(eq(auditLogs.clinic_id, params.clinicId))

  // Apply filters
  // Note: For simplicity, we're using the base clinic filter.
  // Additional filters would be added here in a full implementation.

  const logs = await query
    .orderBy(sql`${auditLogs.created_at} DESC`)
    .limit(limit)
    .offset(offset)

  const [countResult] = await countQuery

  return {
    logs,
    total: countResult?.count || 0,
  }
}

/**
 * Get audit statistics for a clinic.
 */
export async function getAuditStats(clinicId: string): Promise<{
  totalEntries: number
  todayEntries: number
  uniqueUsers: number
  topActions: { action: string; count: number }[]
}> {
  const db = getServerDb()

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(auditLogs)
    .where(eq(auditLogs.clinic_id, clinicId))

  const [todayResult] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(auditLogs)
    .where(
      sql`${auditLogs.clinic_id} = ${clinicId} AND ${auditLogs.created_at} > NOW() - INTERVAL '1 day'`
    )

  const [usersResult] = await db
    .select({ count: sql<number>`count(DISTINCT ${auditLogs.user_id})::int`.mapWith(Number) })
    .from(auditLogs)
    .where(eq(auditLogs.clinic_id, clinicId))

  const topActions = await db
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)::int`.mapWith(Number),
    })
    .from(auditLogs)
    .where(eq(auditLogs.clinic_id, clinicId))
    .groupBy(auditLogs.action)
    .orderBy(sql`count DESC`)
    .limit(10)

  return {
    totalEntries: totalResult?.count || 0,
    todayEntries: todayResult?.count || 0,
    uniqueUsers: usersResult?.count || 0,
    topActions: topActions.map((a) => ({ action: a.action, count: a.count })),
  }
}