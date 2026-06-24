/**
 * Sync Engine — Re-exports from the new background worker.
 * 
 * This file is kept for backward compatibility with existing imports.
 * All sync logic has been moved to:
 * - src/lib/sync/background-worker.ts (worker lifecycle, queue draining)
 * - src/app/api/sync/route.ts (server-side sync processing)
 * - src/lib/sync/queue.ts (local queue management)
 */

export {
  getWorkerState as getSyncState,
  subscribeWorkerState as subscribeSyncState,
  startBackgroundWorker as startAutoSync,
  stopBackgroundWorker as stopAutoSync,
  drainSyncQueue as backgroundSync,
  drainSyncQueue as triggerSync,
  drainSyncQueue as onSyncQueueChanged,
} from './background-worker'

export type {
  WorkerState as SyncState,
  WorkerStatus as SyncStatus,
} from './background-worker'