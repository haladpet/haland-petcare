"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth/store'

interface Customer {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  created_at: string
}

export default function CustomersPage() {
  const user = useAuthStore((s) => s.user)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', address: '' })
  const [saving, setSaving] = useState(false)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('q', search)
      const res = await fetch(`/api/customers?${params.toString()}`)
      const json = await res.json()
      setCustomers(json.data || [])
      if (json.pagination) setTotalPages(json.pagination.totalPages)
    } catch {
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const handleCreate = async () => {
    if (!form.full_name || !form.phone) return
    setSaving(true)
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinic_id: user?.clinic_id }),
      })
      setDialogOpen(false)
      setForm({ full_name: '', phone: '', email: '', address: '' })
      fetchCustomers()
    } catch {
      alert('Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" data-testid="customers-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button data-testid="customer-create-button" onClick={() => setDialogOpen(true)}>+ Add Customer</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          data-testid="customer-search-input"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3" data-testid="customer-loading">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <>
          <div className="space-y-2" data-testid="customer-list">
            {customers.map((c) => (
              <Card key={c.id} className="p-4 hover:bg-accent/50 transition-colors" data-testid={`customer-row-${c.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold" data-testid={`customer-name-${c.id}`}>{c.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.phone && <span data-testid={`customer-phone-${c.id}`}>{c.phone}</span>}
                      {c.email && <span className="ml-3" data-testid={`customer-email-${c.id}`}>{c.email}</span>}
                    </div>
                    {c.address && <div className="text-xs text-muted-foreground mt-1">{c.address}</div>}
                  </div>
                  <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'} data-testid={`customer-status-${c.id}`}>{c.status}</Badge>
                </div>
              </Card>
            ))}
          </div>

          {customers.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground" data-testid="customer-empty">No customers found.</Card>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4" data-testid="customer-pagination">
              <Button data-testid="customer-prev-page" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground" data-testid="customer-page-info">Page {page} of {totalPages}</span>
              <Button data-testid="customer-next-page" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="customer-create-dialog">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <Input data-testid="customer-input-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Customer name" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone *</label>
              <Input data-testid="customer-input-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+6281234567890" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input data-testid="customer-input-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input data-testid="customer-input-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" />
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="customer-cancel-button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button data-testid="customer-save-button" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}