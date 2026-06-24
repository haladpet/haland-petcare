import { getLocalDb } from '@/lib/db/local/client'
import { syncQueue, syncLogs } from '@/lib/db/local/schema'
import { eq, asc, and, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

// ─── Sync State Store (in-memory, shared across modules) ───────
type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncState {
  status: SyncStatus
  lastSyncAt: Date | null
  pendingCount: number
  failedCount: number
  isOnline: boolean
}

let syncState: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
}

type SyncListener = (state: SyncState) => void
const listeners: Set<SyncListener> = new Set()

export function getSyncState(): SyncState {
  return { ...syncState }
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners() {
  const state = getSyncState()
  listeners.forEach((fn) => fn(state))
}

async function refreshPendingCount() {
  try {
    const db = getLocalDb()
    const [pending] = await db
      .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
      .from(syncQueue)
      .where(eq(syncQueue.status, 'PENDING'))
    syncState.pendingCount = pending?.count || 0

    const [failed] = await db
      .select({ count: sql<number>`count(*)::int`.mapWith(Number) })
      .from(syncQueue)
      .where(eq(syncQueue.status, 'FAILED'))
    syncState.failedCount = failed?.count || 0
  } catch {
    // ignore
  }
}

// ─── Exponential Backoff Retry ──────────────────────────────────
const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function syncItem(item: any): Promise<boolean> {
  const db = getLocalDb()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      if (attempt > 0) await sleep(delay)

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: item.id,
            entity: item.entity,
            entity_id: item.entity_id,
            action: item.action,
            payload: item.payload,
            schema_version: item.schema_version,
          }],
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Check if any items need migration
        const results = result.results || []
        const itemResult = results.find((r: any) => r.id === item.id)

        if (itemResult?.status === 'NEEDS_MIGRATION') {
          // Mark as needing migration
          await db
            .update(syncQueue)
            .set({ status: 'FAILED', updated_at: new Date() })
            .where(eq(syncQueue.id, item.id))

          await db.insert(syncLogs).values({
            id: uuidv4(),
            sync_queue_id: item.id,
            event: 'NEEDS_MIGRATION',
            details: { schema_version: item.schema_version },
            created_at: new Date(),
          })
          return false
        }

        // Success — mark as synced
        await db
          .update(syncQueue)
          .set({ status: 'SYNCED', updated_at: new Date() })
          .where(eq(syncQueue.id, item.id))

        await db.insert(syncLogs).values({
          id: uuidv4(),
          sync_queue_id: item.id,
          event: 'SYNCED',
          details: { result: itemResult },
          created_at: new Date(),
        })
        return true
      }

      // Server returned error
      lastError = new Error(`Sync failed: ${response.status} ${result.error || ''}`)
    } catch (err: any) {
      lastError = err
    }
  }

  // All retries exhausted
  await db
    .update(syncQueue)
    .set({ status: 'FAILED', updated_at: new Date() })
    .where(eq(syncQueue.id, item.id))

  await db.insert(syncLogs).values({
    id: uuidv4(),
    sync_queue_id: item.id,
    event: 'FAILED',
    details: { error: lastError?.message, retries: MAX_RETRIES },
    created_at: new Date(),
  })

  return false
}

// ─── backgroundSync ─────────────────────────────────────────────
// Takes up to 100 pending items, groups by entity, syncs sequentially
export async function backgroundSync(): Promise<{ synced: number; failed: number }> {
  if (!syncState.isOnline) {
    syncState.status = 'offline'
    notifyListeners()
    return { synced: 0, failed: 0 }
  }

  syncState.status = 'syncing'
  notifyListeners()

  const db = getLocalDb()
  let synced = 0
  let failed = 0

  try {
    // Get up to 100 pending items, ordered by created_at
    const items = await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, 'PENDING'))
      .orderBy(asc(syncQueue.created_at))
      .limit(100)

    if (items.length === 0) {
      syncState.status = 'idle'
      syncState.lastSyncAt = new Date()
      await refreshPendingCount()
      notifyListeners()
      return { synced: 0, failed: 0 }
    }

    // Group by entity for batch processing
    const grouped = new Map<string, any[]>()
    for (const item of items) {
      const key = item.entity
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(item)
    }

    // Process each group
    for (const [entity, groupItems] of grouped) {
      for (const item of groupItems) {
        const success = await syncItem(item)
        if (success) synced++
        else failed++
      }
    }

    syncState.status = 'idle'
    syncState.lastSyncAt = new Date()
  } catch (err) {
    syncState.status = 'error'
    console.error('backgroundSync error:', err)
  }

  await refreshPendingCount()
  notifyListeners()
  return { synced, failed }
}

// ─── Auto-sync Setup ────────────────────────────────────────────
let syncInterval: ReturnType<typeof setInterval> | null = null
let onlineHandler: (() => void) | null = null

export function startAutoSync() {
  // Sync every 30 seconds if online
  if (syncInterval) clearInterval(syncInterval)
  syncInterval = setInterval(() => {
    if (syncState.isOnline && syncState.status !== 'syncing') {
      backgroundSync()
    }
  }, 30000)

  // Sync when coming back online
  if (typeof window !== 'undefined') {
    onlineHandler = () => {
      syncState.isOnline = true
      notifyListeners()
      backgroundSync()
    }
    window.addEventListener('online', onlineHandler)

    const offlineHandler = () => {
      syncState.isOnline = false
      syncState.status = 'offline'
      notifyListeners()
    }
    window.addEventListener('offline', offlineHandler)
  }

  // Initial sync
  if (syncState.isOnline) {
    backgroundSync()
  }
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
  if (typeof window !== 'undefined' && onlineHandler) {
    window.removeEventListener('online', onlineHandler)
    onlineHandler = null
  }
}

// ─── Manual trigger ─────────────────────────────────────────────
export async function triggerSync() {
  return backgroundSync()
}

// ─── Called when new item is added to sync_queue ────────────────
export async function onSyncQueueChanged() {
  await refreshPendingCount()
  notifyListeners()

  // If online and not currently syncing, trigger sync
  if (syncState.isOnline && syncState.status !== 'syncing') {
    backgroundSync()
  }
}