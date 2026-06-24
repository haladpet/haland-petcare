"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

interface RateEntry {
  id: string
  daily_cost: string
  effective_from: string
  effective_to: string | null
}

interface MonitoringEntry {
  id: string
  monitored_at: string
  vital_signs: any
  notes: string | null
}

interface Hospitalization {
  id: string
  pet_id: string
  cage_id: string
  clinic_id: string
  customer_id: string
  admission_date: string
  discharge_date: string | null
  status: string
  notes: string | null
  rateHistory: RateEntry[]
  monitoring: MonitoringEntry[]
}

interface DischargePreview {
  totalCost: number
  breakdown: {
    dailyCost: number
    effectiveFrom: string
    effectiveTo: string
    days: number
    subtotal: number
  }[]
}

export default function HospitalizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const hospId = params.id as string

  const [hosp, setHosp] = useState<Hospitalization | null>(null)
  const [loading, setLoading] = useState(true)
  const [rateDialogOpen, setRateDialogOpen] = useState(false)
  const [newRate, setNewRate] = useState('')
  const [updatingRate, setUpdatingRate] = useState(false)
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false)
  const [dischargeNotes, setDischargeNotes] = useState('')
  const [dischargePreview, setDischargePreview] = useState<DischargePreview | null>(null)
  const [discharging, setDischarging] = useState(false)
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false)
  const [vitalSigns, setVitalSigns] = useState('')
  const [monitoringNotes, setMonitoringNotes] = useState('')
  const [addingMonitoring, setAddingMonitoring] = useState(false)

  const loadHosp = useCallback(async () => {
    if (!hospId) return
    try {
      const res = await fetch(`/api/hospitalizations/${hospId}`)
      const json = await res.json()
      setHosp(json.data || null)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [hospId])

  useEffect(() => {
    loadHosp()
  }, [loadHosp])

  const handleUpdateRate = async () => {
    if (!newRate || Number(newRate) <= 0) return
    setUpdatingRate(true)
    try {
      await fetch(`/api/hospitalizations/${hospId}/rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_cost: Number(newRate) }),
      })
      setRateDialogOpen(false)
      setNewRate('')
      loadHosp()
    } catch {
      alert('Failed to update rate')
    } finally {
      setUpdatingRate(false)
    }
  }

  const handlePreviewDischarge = async () => {
    try {
      const res = await fetch(`/api/hospitalizations/${hospId}/discharge`)
      const json = await res.json()
      setDischargePreview(json.data || null)
      setDischargeDialogOpen(true)
    } catch {
      alert('Failed to preview discharge')
    }
  }

  const handleDischarge = async () => {
    if (!dischargeNotes) return
    setDischarging(true)
    try {
      const res = await fetch(`/api/hospitalizations/${hospId}/discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discharge_notes: dischargeNotes }),
      })
      const json = await res.json()
      if (json.error) {
        alert(json.error)
        return
      }
      setDischargeDialogOpen(false)
      router.push('/hospitalization/cages')
    } catch {
      alert('Failed to discharge')
    } finally {
      setDischarging(false)
    }
  }

  const handleAddMonitoring = async () => {
    let parsedVitals: any = {}
    try {
      parsedVitals = JSON.parse(vitalSigns)
    } catch {
      alert('Vital signs must be valid JSON')
      return
    }
    setAddingMonitoring(true)
    try {
      await fetch(`/api/hospitalizations/${hospId}/monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vital_signs: parsedVitals, notes: monitoringNotes }),
      })
      setMonitoringDialogOpen(false)
      setVitalSigns('')
      setMonitoringNotes('')
      loadHosp()
    } catch {
      alert('Failed to add monitoring')
    } finally {
      setAddingMonitoring(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!hosp) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center text-muted-foreground">
          Hospitalization not found.
        </Card>
      </div>
    )
  }

  const currentRate = hosp.rateHistory.find((r) => !r.effective_to)
  const isActive = hosp.status === 'ADMITTED'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hospitalization Detail</h1>
          <p className="text-sm text-muted-foreground">
            Admitted: {new Date(hosp.admission_date).toLocaleString('id-ID')}
          </p>
        </div>
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {hosp.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rate History */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Rate History</h2>
              {isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewRate(currentRate?.daily_cost || '')
                    setRateDialogOpen(true)
                  }}
                >
                  Ubah Tarif
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {hosp.rateHistory.map((rate, idx) => (
                <div
                  key={rate.id}
                  className={`p-3 rounded-md ${
                    !rate.effective_to ? 'bg-primary/10 border border-primary/30' : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Rp {Number(rate.daily_cost).toLocaleString('id-ID')}/day
                    </span>
                    {!rate.effective_to && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(rate.effective_from).toLocaleString('id-ID')}
                    {' — '}
                    {rate.effective_to
                      ? new Date(rate.effective_to).toLocaleString('id-ID')
                      : 'Now'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Monitoring Timeline */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Monitoring Timeline</h2>
              {isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonitoringDialogOpen(true)}
                >
                  + Add Monitoring
                </Button>
              )}
            </div>
            {hosp.monitoring.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monitoring entries yet.</p>
            ) : (
              <div className="space-y-3">
                {hosp.monitoring.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-primary/30 pl-4 py-1">
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.monitored_at).toLocaleString('id-ID')}
                    </div>
                    <div className="text-sm mt-1">
                      {entry.vital_signs && typeof entry.vital_signs === 'object' && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(entry.vital_signs).map(([key, val]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {String(val)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Actions</h2>
            <div className="space-y-2">
              {isActive && (
                <>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNewRate(currentRate?.daily_cost || '')
                      setRateDialogOpen(true)
                    }}
                  >
                    Ubah Tarif
                  </Button>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handlePreviewDischarge}
                  >
                    Discharge Patient
                  </Button>
                </>
              )}
              {!isActive && (
                <div className="text-sm text-muted-foreground">
                  Discharged: {hosp.discharge_date
                    ? new Date(hosp.discharge_date).toLocaleString('id-ID')
                    : 'N/A'}
                </div>
              )}
            </div>
          </Card>

          {hosp.notes && (
            <Card className="p-4">
              <h2 className="font-semibold mb-2">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{hosp.notes}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Rate Change Dialog */}
      <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Tarif Harian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Rate</label>
              <p className="text-lg font-bold">
                Rp {currentRate ? Number(currentRate.daily_cost).toLocaleString('id-ID') : '—'}/day
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">New Daily Rate</label>
              <Input
                type="number"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="Enter new rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRate} disabled={updatingRate}>
              {updatingRate ? 'Updating...' : 'Update Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discharge Dialog with Preview */}
      <Dialog open={dischargeDialogOpen} onOpenChange={setDischargeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Discharge Patient — Cost Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {dischargePreview && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Breakdown per Periode Tarif:</h3>
                <div className="border rounded-md divide-y">
                  {dischargePreview.breakdown.map((period, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">
                          Rp {period.dailyCost.toLocaleString('id-ID')}/day × {period.days} day{period.days > 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(period.effectiveFrom).toLocaleDateString('id-ID')} —{' '}
                          {new Date(period.effectiveTo).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                      <span className="font-semibold">
                        Rp {period.subtotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-lg">
                    Rp {dischargePreview.totalCost.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Discharge Notes</label>
              <Textarea
                value={dischargeNotes}
                onChange={(e) => setDischargeNotes(e.target.value)}
                placeholder="Enter discharge notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDischarge} disabled={discharging || !dischargeNotes}>
              {discharging ? 'Discharging...' : 'Confirm Discharge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Monitoring Dialog */}
      <Dialog open={monitoringDialogOpen} onOpenChange={setMonitoringDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Monitoring Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Vital Signs (JSON)
              </label>
              <Textarea
                value={vitalSigns}
                onChange={(e) => setVitalSigns(e.target.value)}
                placeholder='{"temperature": 38.5, "heart_rate": 80, "respiratory_rate": 20}'
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={monitoringNotes}
                onChange={(e) => setMonitoringNotes(e.target.value)}
                placeholder="Monitoring notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMonitoringDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMonitoring} disabled={addingMonitoring}>
              {addingMonitoring ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}