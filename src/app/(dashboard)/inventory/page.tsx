"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/auth/store'

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  description: string | null
  unit: string | null
  current_stock: number
}

interface ExpiringItem {
  batch: {
    id: string
    batch_number: string | null
    quantity: number
    expires_at: string | null
  }
  item: {
    id: string
    name: string
    unit: string | null
  }
}

export default function InventoryPage() {
  const user = useAuthStore((s) => s.user)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [lowStock, setLowStock] = useState<InventoryItem[]>([])
  const [expiring, setExpiring] = useState<ExpiringItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', unit: '', sku: '', description: '' })
  const [batchForm, setBatchForm] = useState({ item_id: '', batch_number: '', quantity: '0', expires_at: '' })
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [allRes, lowRes, expRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/inventory?filter=low-stock&threshold=5'),
        fetch('/api/inventory?filter=expiring-soon&days=30'),
      ])
      const allJson = await allRes.json()
      const lowJson = await lowRes.json()
      const expJson = await expRes.json()
      setItems(allJson.data || [])
      setLowStock(lowJson.data || [])
      setExpiring(expJson.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateItem = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinic_id: user?.clinic_id }),
      })
      setDialogOpen(false)
      setForm({ name: '', unit: '', sku: '', description: '' })
      fetchData()
    } catch {
      alert('Failed to create item')
    } finally {
      setSaving(false)
    }
  }

  const handleAddBatch = async () => {
    if (!batchForm.item_id || !batchForm.quantity) return
    setSaving(true)
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-batch', ...batchForm, quantity: Number(batchForm.quantity) }),
      })
      setBatchDialogOpen(false)
      setBatchForm({ item_id: '', batch_number: '', quantity: '0', expires_at: '' })
      fetchData()
    } catch {
      alert('Failed to add batch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>+ Add Batch</Button>
          <Button onClick={() => setDialogOpen(true)}>+ Add Item</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Items ({items.length})</TabsTrigger>
          <TabsTrigger value="low-stock">
            Low Stock ({lowStock.length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon ({expiring.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.unit && <span>{item.unit}</span>}
                      {item.sku && <span className="ml-2">SKU: {item.sku}</span>}
                    </div>
                  </div>
                  <Badge variant={item.current_stock > 5 ? 'default' : 'destructive'}>
                    Stock: {item.current_stock}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="low-stock">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : lowStock.length > 0 ? (
            <div className="space-y-2">
              {lowStock.map((item) => (
                <Card key={item.id} className="p-3 flex items-center justify-between border-red-200 bg-red-50">
                  <div>
                    <div className="font-semibold text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.unit}</div>
                  </div>
                  <Badge variant="destructive">Stock: {item.current_stock} ⚠</Badge>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">No low stock items.</Card>
          )}
        </TabsContent>

        <TabsContent value="expiring">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : expiring.length > 0 ? (
            <div className="space-y-2">
              {expiring.map((entry) => (
                <Card key={entry.batch.id} className="p-3 flex items-center justify-between border-yellow-200 bg-yellow-50">
                  <div>
                    <div className="font-semibold text-sm">{entry.item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Batch: {entry.batch.batch_number || 'N/A'} • Qty: {entry.batch.quantity}
                    </div>
                    {entry.batch.expires_at && (
                      <div className="text-xs text-yellow-700">
                        Expires: {new Date(entry.batch.expires_at).toLocaleDateString('id-ID')}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    Expiring
                  </Badge>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">No items expiring soon.</Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Item name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Unit</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. tablet, bottle" />
              </div>
              <div>
                <label className="text-sm font-medium">SKU</label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU code" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateItem} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Batch Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Stock Batch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Item *</label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={batchForm.item_id}
                onChange={(e) => setBatchForm({ ...batchForm, item_id: e.target.value })}
              >
                <option value="">Select item...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} (stock: {item.current_stock})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Quantity *</label>
                <Input type="number" value={batchForm.quantity} onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Batch Number</label>
                <Input value={batchForm.batch_number} onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })} placeholder="Batch #" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Expiry Date</label>
              <Input type="date" value={batchForm.expires_at} onChange={(e) => setBatchForm({ ...batchForm, expires_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBatch} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}