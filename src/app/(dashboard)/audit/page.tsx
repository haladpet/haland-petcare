"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/lib/auth/store'

interface AuditEntry {
  id: string
  user_id: string | null
  clinic_id: string | null
  action: string
  entity: string | null
  entity_id: string | null
  changes: any
  ip_address: string | null
  created_at: string
}

export default function AuditPage() {
  const user = useAuthStore((s) => s.user)
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    action: '',
    entity: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  })

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      if (filters.action) params.set('action', filters.action)
      if (filters.entity) params.set('entity', filters.entity)
      if (filters.userId) params.set('user_id', filters.userId)
      if (filters.dateFrom) params.set('from', filters.dateFrom)
      if (filters.dateTo) params.set('to', filters.dateTo)

      const res = await fetch(`/api/audit?${params.toString()}`)
      const json = await res.json()
      setEntries(json.data || [])
      if (json.pagination) {
        setTotalPages(json.pagination.totalPages)
      }
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  if (user?.role !== 'OWNER') {
    return (
      <div className="p-6">
        <Card className="p-8 text-center text-muted-foreground">
          Access denied. Only clinic owners can view audit logs.
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium">Action</label>
            <Input
              placeholder="e.g. CREATE_CUSTOMER"
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Entity</label>
            <Input
              placeholder="e.g. customers"
              value={filters.entity}
              onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium">User ID</label>
            <Input
              placeholder="UUID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium">From</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium">To</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchAudit() }}>
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3 w-40">Timestamp</th>
                  <th className="text-left py-2 px-3">Action</th>
                  <th className="text-left py-2 px-3">Entity</th>
                  <th className="text-left py-2 px-3">Entity ID</th>
                  <th className="text-left py-2 px-3">User</th>
                  <th className="text-left py-2 px-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-accent/50">
                    <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-xs">{entry.entity || '—'}</td>
                    <td className="py-2 px-3 text-xs font-mono">
                      {entry.entity_id ? entry.entity_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="py-2 px-3 text-xs font-mono">
                      {entry.user_id ? entry.user_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="py-2 px-3 text-xs max-w-xs truncate">
                      {entry.changes
                        ? typeof entry.changes === 'string'
                          ? entry.changes.slice(0, 80)
                          : JSON.stringify(entry.changes).slice(0, 80)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground mt-4">
              No audit entries found.
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}