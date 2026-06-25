"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth/store'

interface Appointment {
  id: string
  customer_id: string
  pet_id: string | null
  doctor_id: string | null
  scheduled_at: string
  status: string
  reason: string | null
  notes: string | null
}

export default function AppointmentsPage() {
  const user = useAuthStore((s) => s.user)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    pet_id: '',
    doctor_id: '',
    scheduled_at: '',
    reason: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/appointments')
      const json = await res.json()
      setAppointments(json.data || [])
    } catch {
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  const handleCreate = async () => {
    if (!form.customer_id || !form.scheduled_at) return
    setSaving(true)
    try {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clinic_id: user?.clinic_id }),
      })
      setDialogOpen(false)
      setForm({ customer_id: '', pet_id: '', doctor_id: '', scheduled_at: '', reason: '', notes: '' })
      fetchAppointments()
    } catch {
      alert('Failed to create appointment')
    } finally {
      setSaving(false)
    }
  }

  const statusColor: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-gray-100 text-gray-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" data-testid="appointments-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Button data-testid="appointment-create-button" onClick={() => setDialogOpen(true)}>+ New Appointment</Button>
      </div>

      {loading ? (
        <div className="space-y-3" data-testid="appointment-loading">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3" data-testid="appointment-list">
          {appointments.map((apt) => (
            <Card key={apt.id} className="p-4 hover:bg-accent/50 transition-colors" data-testid={`appointment-row-${apt.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {new Date(apt.scheduled_at).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(apt.scheduled_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {apt.reason && (
                    <p className="text-sm text-muted-foreground mb-1">{apt.reason}</p>
                  )}
                  {apt.notes && (
                    <p className="text-xs text-muted-foreground italic">{apt.notes}</p>
                  )}
                </div>
                <Badge className={statusColor[apt.status] || ''} data-testid={`appointment-status-${apt.id}`}>{apt.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && appointments.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground" data-testid="appointment-empty">No appointments found.</Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="appointment-create-dialog">
          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Customer ID *</label>
              <Input data-testid="appointment-input-customer-id" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} placeholder="Customer UUID" />
            </div>
            <div>
              <label className="text-sm font-medium">Pet ID</label>
              <Input data-testid="appointment-input-pet-id" value={form.pet_id} onChange={(e) => setForm({ ...form, pet_id: e.target.value })} placeholder="Pet UUID (optional)" />
            </div>
            <div>
              <label className="text-sm font-medium">Doctor ID</label>
              <Input data-testid="appointment-input-doctor-id" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} placeholder="Doctor UUID (optional)" />
            </div>
            <div>
              <label className="text-sm font-medium">Date & Time *</label>
              <Input data-testid="appointment-input-datetime" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input data-testid="appointment-input-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for visit" />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input data-testid="appointment-input-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="appointment-cancel-button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button data-testid="appointment-save-button" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}