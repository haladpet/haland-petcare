"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/auth/store'

interface QueueItem {
  id: string
  queue_number: string
  customer_id: string
  pet_id: string | null
  doctor_id: string | null
  priority: string
  status: string
  position: number
  created_at: string
}

export default function QueuePage() {
  const user = useAuthStore((s) => s.user)
  const [queues, setQueues] = useState<{ currentServing: QueueItem[]; waiting: QueueItem[] }>({ currentServing: [], waiting: [] })
  const [loading, setLoading] = useState(true)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/queues')
      const json = await res.json()
      setQueues(json.data || { currentServing: [], waiting: [] })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const handleNext = async (queueId: string) => {
    try {
      await fetch(`/api/queues/${queueId}/next`, { method: 'POST' })
      fetchQueue()
    } catch {
      alert('Failed to update queue')
    }
  }

  const handleStatus = async (queueId: string, status: string) => {
    try {
      await fetch(`/api/queues/${queueId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchQueue()
    } catch {
      alert('Failed to update status')
    }
  }

  const priorityColor: Record<string, string> = {
    EMERGENCY: 'bg-red-100 text-red-700 border-red-300',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
    NORMAL: 'bg-blue-100 text-blue-700 border-blue-300',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Queue Management</h1>

      {/* Currently Serving */}
      <Card className="p-4 mb-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Currently Serving
        </h2>
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : queues.currentServing.length > 0 ? (
          queues.currentServing.map((q) => (
            <div key={q.id} className="p-3 bg-green-50 rounded-md flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">{q.queue_number}</div>
                <div className="text-xs text-muted-foreground">
                  Started: {new Date(q.created_at).toLocaleTimeString('id-ID')}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleStatus(q.id, 'COMPLETED')}>
                  Complete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No patient currently being served.</p>
        )}
      </Card>

      {/* Waiting List */}
      <Card className="p-4">
        <h2 className="font-semibold mb-3">Waiting List ({queues.waiting.length})</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : queues.waiting.length > 0 ? (
          <div className="space-y-2">
            {queues.waiting.map((q) => (
              <div key={q.id} className="p-3 border rounded-md flex items-center justify-between hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-muted-foreground w-8">#{q.position}</div>
                  <div>
                    <div className="font-semibold">{q.queue_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleTimeString('id-ID')}
                    </div>
                  </div>
                  <Badge className={priorityColor[q.priority] || ''}>{q.priority}</Badge>
                </div>
                <Button size="sm" onClick={() => handleNext(q.id)}>
                  Serve Next
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No patients waiting.</p>
        )}
      </Card>
    </div>
  )
}