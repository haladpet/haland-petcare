import { getLocalDb } from '@/lib/db/local/client'
import { syncQueue, syncLogs } from '@/lib/db/local/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ───────────────────────────────────────────────────────
export type WorkerStatus = 'idle' | 'running' | 'paused' | 'stopped'
export type SyncEventType = 'sync_started' | 'sync_completed' | 'sync_failed' | 'item_synced' | 'item_failed' | 'queue_drained' | 'online' | 'offline'

export interface WorkerState {
  status: WorkerStatus
  isOnline: boolean
  lastSyncAt: Date | null
  pendingCount: number
  failedCount: number
  inProgressCount: number
  consecutiveFailures: number
  currentBackoffMs: number
}

export interface SyncEvent {
  type: SyncEventType
  timestamp: Date
  data?: unknown
}

// ─── Configuration ───────────────────────────────────────────────
const CONFIG = {
  MAX_BATCH_SIZE: 100,
  MAX_RETRIES: 5,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 60000, // 1 minute max backoff
  SYNC_INTERVAL_MS: 30000, // 30 seconds between sync cycles
  ONLINE_CHECK_INTERVAL_MS: 5000, // 5 seconds
  MAX_CONSECUTIVE_FAILURES: 10, // Pause after 10 consecutive failures
  QUEUE_DRAIN_THRESHOLD: 500, // Alert if queue exceeds this
}

// ─── Worker State ────────────────────────────────────────────────
let workerState: WorkerState = {
  status: 'idle',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  inProgressCount: 0,
  consecutiveFailures: 0,
  currentBackoffMs: CONFIG.BASE_DELAY_MS,
}

type StateListener = (state: WorkerState) => void
type EventListener = (event: SyncEvent) => void

const stateListeners: Set<StateListener> = new Set()
const eventListeners: Set<EventListener> = new Set()

function updateState(partial: Partial<WorkerState>) {
  workerState = { ...workerState, ...partial }
  stateListeners.forEach((fn) => fn(workerState))
}

function emitEvent(type: SyncEventType, data?: unknown) {
  const event: SyncEvent = { type, timestamp: new Date(), data }
  eventListeners.forEach((fn) => fn(event))
}

// ─── Public API ──────────────────────────────────────────────────

export function getWorkerState(): WorkerState {
  return { ...workerState }
}

export function subscribeWorkerState(listener: StateListener): () => void {
  stateListeners.add(listener)
  return () => stateListeners.delete(listener)
}

export function subscribeWorkerEvents(listener: EventListener): () => void {
  eventListeners.add(listener)
  return () => eventListeners.delete(listener)
}

// ─── Online Detection ────────────────────────────────────────────

function setupOnlineDetection() {
  if (typeof window === 'undefined') return

  window.addEventListener('online', () => {
    updateState({ isOnline: true, consecutiveFailures: 0, currentBackoffMs: CONFIG.BASE_DELAY_MS })
    emitEvent('online')
    // Immediately try to sync when coming back online
    drainSyncQueue()
  })

  window.addEventListener('offline', () => {
    updateState({ isOnline: false })
    emitEvent('offline')
  })

  // Periodic online check using fetch to a lightweight endpoint
  setInterval(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const response = await fetch('/api/_health', {
        method: 'HEAD',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const online = response.ok
      if (online !== workerState.isOnline) {
        updateState({ isOnline: online })
        emitEvent(online ? 'online' : 'offline')
        if (online) drainSyncQueue()
      }
    } catch {
      if (workerState.isOnline) {
        updateState({ isOnline: false })
        emitEvent('offline')
      }
    }
  }, CONFIG.ONLINE_CHECK_INTERVAL_MS)
}

// ─── Queue Draining ──────────────────────────────────────────────

async function refreshQueueCounts() {
  try {
    const db = getLocalDb()

    const [pending] = await db
      .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
      .from(syncQueue)
      .where(eq(syncQueue.status, 'PENDING'))

    const [failed] = await db
      .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
      .from(syncQueue)
      .where(eq(syncQueue.status, 'FAILED'))

    const [inProgress] = await db
      .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
      .from(syncQueue)
      .where(eq(syncQueue.status, 'IN_PROGRESS'))

    updateState({
      pendingCount: pending?.count || 0,
      failedCount: failed?.count || 0,
      inProgressCount: inProgress?.count || 0,
    })
  } catch {
    // Ignore errors in count refresh
  }
}

/**
 * Drain the sync queue — process all pending items.
 * Uses exponential backoff for retries.
 */
export async function drainSyncQueue(): Promise<{
  synced: number
  failed: number
  conflicts: number
}> {
  if (!workerState.isOnline) {
    return { synced: 0, failed: 0, conflicts: 0 }
  }

  if (workerState.status === 'running') {
    return { synced: 0, failed: 0, conflicts: 0 }
  }

  // Check if we've had too many consecutive failures
  if (workerState.consecutiveFailures >= CONFIG.MAX_CONSECUTIVE_FAILURES) {
    console.warn('Sync worker paused due to consecutive failures')
    updateState({ status: 'paused' })
    return { synced: 0, failed: 0, conflicts: 0 }
  }

  updateState({ status: 'running' })
  emitEvent('sync_started')

  const db = getLocalDb()
  let synced = 0
  let failed = 0
  let conflicts = 0

  try {
    // Get pending items ordered by creation time
    const items = await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, 'PENDING'))
      .orderBy(asc(syncQueue.created_at))
      .limit(CONFIG.MAX_BATCH_SIZE)

    if (items.length === 0) {
      updateState({
        status: 'idle',
        lastSyncAt: new Date(),
        consecutiveFailures: 0,
        currentBackoffMs: CONFIG.BASE_DELAY_MS,
      })
      emitEvent('queue_drained')
      await refreshQueueCounts()
      return { synced: 0, failed: 0, conflicts: 0 }
    }

    // Mark items as in-progress
    const itemIds = items.map((i) => i.id)
    await db
      .update(syncQueue)
      .set({ status: 'IN_PROGRESS', updated_at: new Date() })
      .where(sql`${syncQueue.id} IN (${itemIds.map(() => '?').join(',')})`)

    // Send batch to server
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((item) => ({
          id: item.id,
          entity: item.entity,
          entity_id: item.entity_id,
          action: item.action,
          payload: item.payload,
          schema_version: item.schema_version,
        })),
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      // Server returned error — mark all as failed
      await db
        .update(syncQueue)
        .set({ status: 'FAILED', updated_at: new Date() })
        .where(sql`${syncQueue.id} IN (${itemIds.map(() => '?').join(',')})`)

      failed = items.length
      updateState({
        consecutiveFailures: workerState.consecutiveFailures + 1,
        currentBackoffMs: Math.min(
          workerState.currentBackoffMs * 2,
          CONFIG.MAX_DELAY_MS
        ),
      })
      emitEvent('sync_failed', { error: result.error, count: items.length })
    } else {
      // Process individual results
      const results = result.results || []

      for (const itemResult of results) {
        const item = items.find((i) => i.id === itemResult.id)
        if (!item) continue

        switch (itemResult.status) {
          case 'SYNCED':
            await db
              .update(syncQueue)
              .set({ status: 'SYNCED', updated_at: new Date() })
              .where(eq(syncQueue.id, item.id))

            await db.insert(syncLogs).values({
              id: uuidv4(),
              sync_queue_id: item.id,
              event: 'SYNCED',
              details: { server_result: itemResult },
              created_at: new Date(),
            })
            synced++
            emitEvent('item_synced', { entity: item.entity, entityId: item.entity_id })
            break

          case 'CONFLICT':
            await db
              .update(syncQueue)
              .set({ status: 'CONFLICT', updated_at: new Date() })
              .where(eq(syncQueue.id, item.id))

            await db.insert(syncLogs).values({
              id: uuidv4(),
              sync_queue_id: item.id,
              event: 'CONFLICT',
              details: { conflict_id: itemResult.conflictId },
              created_at: new Date(),
            })
            conflicts++
            break

          case 'NEEDS_MIGRATION':
            await db
              .update(syncQueue)
              .set({ status: 'NEEDS_MIGRATION', updated_at: new Date() })
              .where(eq(syncQueue.id, item.id))

            await db.insert(syncLogs).values({
              id: uuidv4(),
              sync_queue_id: item.id,
              event: 'NEEDS_MIGRATION',
              details: { current_version: itemResult.currentVersion, item_version: itemResult.itemVersion },
              created_at: new Date(),
            })
            failed++
            break

          case 'ERROR':
          default:
            await db
              .update(syncQueue)
              .set({ status: 'FAILED', updated_at: new Date() })
              .where(eq(syncQueue.id, item.id))

            await db.insert(syncLogs).values({
              id: uuidv4(),
              sync_queue_id: item.id,
              event: 'FAILED',
              details: { error: itemResult.error },
              created_at: new Date(),
            })
            failed++
            emitEvent('item_failed', { entity: item.entity, error: itemResult.error })
            break
        }
      }

      // Reset failure count on success
      updateState({
        consecutiveFailures: 0,
        currentBackoffMs: CONFIG.BASE_DELAY_MS,
        lastSyncAt: new Date(),
      })
    }

    emitEvent('sync_completed', { synced, failed, conflicts })
  } catch (err: unknown) {
    // Network error or other catastrophic failure
    // Revert in-progress items back to pending
    const items = await db
      .select({ id: syncQueue.id })
      .from(syncQueue)
      .where(eq(syncQueue.status, 'IN_PROGRESS'))
      .limit(CONFIG.MAX_BATCH_SIZE)

    if (items.length > 0) {
      const ids = items.map((i) => i.id)
      await db
        .update(syncQueue)
        .set({ status: 'PENDING', updated_at: new Date() })
        .where(sql`${syncQueue.id} IN (${ids.map(() => '?').join(',')})`)
    }

    failed = items.length
    updateState({
      consecutiveFailures: workerState.consecutiveFailures + 1,
      currentBackoffMs: Math.min(
        workerState.currentBackoffMs * 2,
        CONFIG.MAX_DELAY_MS
      ),
    })
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    emitEvent('sync_failed', { error: errorMessage })
  }

  updateState({ status: 'idle' })
  await refreshQueueCounts()

  // If there are still pending items, schedule another drain
  if (workerState.pendingCount > 0 && workerState.isOnline) {
    setTimeout(() => drainSyncQueue(), workerState.currentBackoffMs)
  }

  return { synced, failed, conflicts }
}

// ─── Retry Failed Items ──────────────────────────────────────────

export async function retryFailedItems(): Promise<number> {
  const db = getLocalDb()

  const failedItems = await db
    .select({ id: syncQueue.id })
    .from(syncQueue)
    .where(eq(syncQueue.status, 'FAILED'))
    .limit(CONFIG.MAX_BATCH_SIZE)

  if (failedItems.length === 0) return 0

  const ids = failedItems.map((i) => i.id)
  await db
    .update(syncQueue)
    .set({ status: 'PENDING', updated_at: new Date() })
    .where(sql`${syncQueue.id} IN (${ids.map(() => '?').join(',')})`)

  await refreshQueueCounts()

  // Trigger drain
  if (workerState.isOnline) {
    drainSyncQueue()
  }

  return failedItems.length
}

// ─── Worker Lifecycle ────────────────────────────────────────────

let syncTimer: ReturnType<typeof setInterval> | null = null
let healthCheckTimer: ReturnType<typeof setInterval> | null = null

/**
 * Start the background sync worker.
 * - Syncs every 30 seconds
 * - Checks online status every 5 seconds
 * - Drains queue immediately on start
 */
export function startBackgroundWorker(): void {
  if (syncTimer) return // Already running

  setupOnlineDetection()
  refreshQueueCounts()

  // Periodic sync
  syncTimer = setInterval(() => {
    if (workerState.isOnline && workerState.status === 'idle') {
      drainSyncQueue()
    }
  }, CONFIG.SYNC_INTERVAL_MS)

  // Initial drain
  if (workerState.isOnline) {
    drainSyncQueue()
  }

  console.log('[BackgroundWorker] Started')
}

/**
 * Stop the background sync worker.
 */
export function stopBackgroundWorker(): void {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
  updateState({ status: 'stopped' })
  console.log('[BackgroundWorker] Stopped')
}

/**
 * Pause the background sync worker.
 * Sync will not run until resumed.
 */
export function pauseBackgroundWorker(): void {
  updateState({ status: 'paused' })
  console.log('[BackgroundWorker] Paused')
}

/**
 * Resume the background sync worker.
 */
export function resumeBackgroundWorker(): void {
  updateState({ status: 'idle' })
  if (workerState.isOnline) {
    drainSyncQueue()
  }
  console.log('[BackgroundWorker] Resumed')
}

/**
 * Get queue health metrics.
 */
export async function getQueueHealth(): Promise<{
  pending: number
  failed: number
  inProgress: number
  conflicts: number
  needsMigration: number
  oldestPendingMs: number | null
  isHealthy: boolean
}> {
  const db = getLocalDb()

  const [pending] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(syncQueue)
    .where(eq(syncQueue.status, 'PENDING'))

  const [failed] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(syncQueue)
    .where(eq(syncQueue.status, 'FAILED'))

  const [inProgress] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(syncQueue)
    .where(eq(syncQueue.status, 'IN_PROGRESS'))

  const [conflicts] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(syncQueue)
    .where(eq(syncQueue.status, 'CONFLICT'))

  const [needsMigration] = await db
    .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
    .from(syncQueue)
    .where(eq(syncQueue.status, 'NEEDS_MIGRATION'))

  // Get oldest pending item
  const [oldest] = await db
    .select({ created_at: syncQueue.created_at })
    .from(syncQueue)
    .where(eq(syncQueue.status, 'PENDING'))
    .orderBy(asc(syncQueue.created_at))
    .limit(1)

  const pendingCount = pending?.count || 0
  const oldestPendingMs = oldest?.created_at
    ? Date.now() - new Date(oldest.created_at).getTime()
    : null

  const isHealthy =
    pendingCount < CONFIG.QUEUE_DRAIN_THRESHOLD &&
    (failed?.count || 0) < 50 &&
    workerState.consecutiveFailures < CONFIG.MAX_CONSECUTIVE_FAILURES

  return {
    pending: pendingCount,
    failed: failed?.count || 0,
    inProgress: inProgress?.count || 0,
    conflicts: conflicts?.count || 0,
    needsMigration: needsMigration?.count || 0,
    oldestPendingMs,
    isHealthy,
  }
}