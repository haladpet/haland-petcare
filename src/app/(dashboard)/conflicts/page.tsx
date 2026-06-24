"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface ConflictItem {
  id: string
  entity: string
  entity_id: string
  conflict_data: any
  resolved: boolean
  created_at: string
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    loadConflicts()
  }, [])

  async function loadConflicts() {
    try {
      const res = await fetch('/api/sync/resolve')
      const json = await res.json()
      setConflicts(json.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(conflictId: string, resolution: 'LOCAL_WINS' | 'SERVER_WINS') {
    setResolving(conflictId)
    try {
      await fetch('/api/sync/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conflict_id: conflictId, resolution }),
      })
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId))
    } catch {
      alert('Failed to resolve conflict')
    } finally {
      setResolving(null)
    }
  }

  function getChangedFields(localData: any, serverData: any): string[] {
    if (!localData || !serverData) return Object.keys(localData || serverData || {})
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)])
    const changed: string[] = []
    for (const key of allKeys) {
      if (JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])) {
        changed.push(key)
      }
    }
    return changed
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Conflict Resolution</h1>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full mb-4" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Conflict Resolution</h1>

      {conflicts.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No pending conflicts. All data is synchronized.
        </Card>
      )}

      <div className="space-y-6">
        {conflicts.map((conflict) => {
          const data = typeof conflict.conflict_data === 'string'
            ? JSON.parse(conflict.conflict_data)
            : conflict.conflict_data

          const localData = data?.local_data || {}
          const serverData = data?.server_data || {}
          const conflictingItems = data?.conflicting_items || []
          const changedFields = getChangedFields(localData, serverData)

          return (
            <Card key={conflict.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Badge variant="outline" className="mr-2">
                    {conflict.entity}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ID: {conflict.entity_id?.slice(0, 8)}...
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(conflict.created_at).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Local */}
                <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-950">
                  <h3 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-300">
                    📱 Local (This Device)
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(localData).map(([key, value]) => {
                      const isChanged = changedFields.includes(key)
                      return (
                        <div
                          key={key}
                          className={`text-xs py-1 px-2 rounded ${
                            isChanged
                              ? 'bg-yellow-100 dark:bg-yellow-900 font-medium'
                              : ''
                          }`}
                        >
                          <span className="font-medium">{key}:</span>{' '}
                          {typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value ?? '—')}
                          {isChanged && (
                            <span className="ml-1 text-yellow-600">⚠</span>
                          )}
                        </div>
                      )
                    })}
                    {Object.keys(localData).length === 0 && (
                      <p className="text-xs text-muted-foreground">No local data</p>
                    )}
                  </div>
                </div>

                {/* Server */}
                <div className="border rounded-md p-3 bg-green-50 dark:bg-green-950">
                  <h3 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-300">
                    ☁️ Server
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(serverData).map(([key, value]) => {
                      const isChanged = changedFields.includes(key)
                      return (
                        <div
                          key={key}
                          className={`text-xs py-1 px-2 rounded ${
                            isChanged
                              ? 'bg-yellow-100 dark:bg-yellow-900 font-medium'
                              : ''
                          }`}
                        >
                          <span className="font-medium">{key}:</span>{' '}
                          {typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value ?? '—')}
                          {isChanged && (
                            <span className="ml-1 text-yellow-600">⚠</span>
                          )}
                        </div>
                      )
                    })}
                    {Object.keys(serverData).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No server data (new local record)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {changedFields.length > 0 && (
                <div className="mb-3">
                  <Badge variant="destructive" className="text-xs">
                    {changedFields.length} field{changedFields.length > 1 ? 's' : ''} differ
                  </Badge>
                </div>
              )}

              {conflictingItems.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {conflictingItems.length} conflicting change(s) from other device(s)
                  </p>
                </div>
              )}

              <Separator className="my-3" />

              {/* Resolution buttons */}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleResolve(conflict.id, 'LOCAL_WINS')}
                  disabled={resolving === conflict.id}
                >
                  {resolving === conflict.id ? 'Resolving...' : 'Keep Local'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolve(conflict.id, 'SERVER_WINS')}
                  disabled={resolving === conflict.id}
                >
                  Use Server
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}