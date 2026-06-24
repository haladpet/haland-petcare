"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth/store'
import Link from 'next/link'

interface Pet {
  id: string
  name: string
  species: string | null
  breed: string | null
  gender: string | null
  weight: string | null
  customer_id: string
  status: string
}

export default function PetsPage() {
  const user = useAuthStore((s) => s.user)
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: '', species: 'DOG', breed: '', gender: '', customer_id: '' })
  const [saving, setSaving] = useState(false)

  const fetchPets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('q', search)
      const res = await fetch(`/api/pets?${params.toString()}`)
      const json = await res.json()
      setPets(json.data || [])
    } catch {
      setPets([])
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchPets() }, [fetchPets])

  const handleCreate = async () => {
    if (!form.name || !form.customer_id) return
    setSaving(true)
    try {
      await fetch('/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinic_id: user?.clinic_id }),
      })
      setDialogOpen(false)
      setForm({ name: '', species: 'DOG', breed: '', gender: '', customer_id: '' })
      fetchPets()
    } catch {
      alert('Failed to create pet')
    } finally {
      setSaving(false)
    }
  }

  const speciesEmoji: Record<string, string> = { DOG: '🐕', CAT: '🐈', BIRD: '🐦', OTHER: '🐾' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pets</h1>
        <Button onClick={() => setDialogOpen(true)}>+ Add Pet</Button>
      </div>

      <div className="flex gap-3 mb-4">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pets.map((pet) => (
            <Link key={pet.id} href={`/pets/${pet.id}/history`}>
              <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{speciesEmoji[pet.species || 'OTHER'] || '🐾'}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{pet.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {pet.species && <span>{pet.species}</span>}
                      {pet.breed && <span className="ml-2">• {pet.breed}</span>}
                      {pet.gender && <span className="ml-2">• {pet.gender}</span>}
                    </div>
                    {pet.weight && <div className="text-xs text-muted-foreground mt-1">{pet.weight} kg</div>}
                  </div>
                  <Badge variant={pet.status === 'ACTIVE' ? 'default' : 'secondary'}>{pet.status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && pets.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">No pets found.</Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pet name" />
            </div>
            <div>
              <label className="text-sm font-medium">Customer ID *</label>
              <Input value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} placeholder="Customer UUID" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Species</label>
                <select className="w-full border rounded-md p-2 text-sm" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
                  <option value="DOG">Dog</option>
                  <option value="CAT">Cat</option>
                  <option value="BIRD">Bird</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select className="w-full border rounded-md p-2 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Breed</label>
              <Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Breed" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}