"use client"

import React, { useEffect, useState } from 'react'
import { subscribeSyncState, getSyncState } from '@/lib/sync/engine'

export default function SyncStatusBar() {
  const [state, setState] = useState(getSyncState())

  useEffect(() => {
    const unsub = subscribeSyncState(setState)
    setState(getSyncState())
    return unsub
  }, [])

  const statusColor = state.isOnline
    ? state.status === 'running'
      ? 'bg-yellow-500'
      : state.status === 'paused'
      ? 'bg-red-500'
      : 'bg-green-500'
    : 'bg-gray-400'

  const statusLabel = state.isOnline
    ? state.status === 'running'
      ? 'Syncing...'
      : state.status === 'paused'
      ? 'Sync Error'
      : 'Online'
    : 'Offline'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border px-4 py-1.5 flex items-center justify-between text-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
          <span className="font-medium">{statusLabel}</span>
        </div>
        {state.lastSyncAt && (
          <span className="text-muted-foreground">
            Last sync: {state.lastSyncAt.toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {state.pendingCount > 0 && (
          <span className="text-yellow-600 font-medium">
            {state.pendingCount} pending
          </span>
        )}
        {state.failedCount > 0 && (
          <span className="text-red-600 font-medium">
            {state.failedCount} failed
          </span>
        )}
        {state.pendingCount === 0 && state.failedCount === 0 && state.isOnline && (
          <span className="text-green-600">All synced</span>
        )}
      </div>
    </div>
  )
}