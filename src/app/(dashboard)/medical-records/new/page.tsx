"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import PrescriptionBuilder from '@/components/shared/prescription-builder'

const VISIT_TYPES = [
  { value: 'ROUTINE_CHECKUP', label: 'Routine Checkup' },
  { value: 'VACCINATION', label: 'Vaccination' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'GROOMING', label: 'Grooming' },
  { value: 'SURGERY', label: 'Surgery' },
  { value: 'DENTAL', label: 'Dental' },
  { value: 'OTHER', label: 'Other' },
]

const STORAGE_KEY = 'medical-record-draft'

interface DraftData {
  pet_id: string
  customer_id: string
  clinic_id: string
  queue_id?: string
  visit_type: string
  visit_date: string
  body_condition_score: string
  temperature: string
  heart_rate: string
  respiratory_rate: string
  weight: string
  chief_complaint: string
  physical_exam_notes: string
  diagnosis: string
  treatment: string
  notes: string
  lab_results: string
  follow_up_date: string
  prescriptionItems: any[]
}

const emptyDraft: DraftData = {
  pet_id: '',
  customer_id: '',
  clinic_id: '',
  queue_id: '',
  visit_type: 'ROUTINE_CHECKUP',
  visit_date: new Date().toISOString().split('T')[0],
  body_condition_score: '',
  temperature: '',
  heart_rate: '',
  respiratory_rate: '',
  weight: '',
  chief_complaint: '',
  physical_exam_notes: '',
  diagnosis: '',
  treatment: '',
  notes: '',
  lab_results: '',
  follow_up_date: '',
  prescriptionItems: [],
}

export default function NewMedicalRecordPage() {
  const router = useRouter()
  const [draft, setDraft] = useState<DraftData>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('physical')
  const [pets, setPets] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setDraft({ ...emptyDraft, ...parsed })
      }
    } catch { /* ignore */ }
  }, [])

  // Load pets and customers
  useEffect(() => {
    async function load() {
      try {
        const [petsRes, custRes] = await Promise.all([
          fetch('/api/pets'),
          fetch('/api/customers'),
        ])
        const petsData = await petsRes.json()
        const custData = await custRes.json()
        setPets(petsData.data || [])
        setCustomers(custData.data || [])
      } catch { /* ignore */ }
      setLoadingMeta(false)
    }
    load()
  }, [])

  // Debounced auto-save to localStorage
  const saveDraft = useCallback((data: DraftData) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setLastSaved(new Date().toLocaleTimeString())
    }, 1000)
  }, [])

  const updateField = (field: keyof DraftData, value: string) => {
    const updated = { ...draft, [field]: value }
    setDraft(updated)
    saveDraft(updated)
  }

  const handleSubmit = async () => {
    if (!draft.pet_id || !draft.customer_id || !draft.clinic_id) {
      alert('Please select pet, customer, and clinic')
      return
    }
    setSaving(true)
    try {
      // Create medical record
      const mrRes = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_id: draft.clinic_id,
          customer_id: draft.customer_id,
          pet_id: draft.pet_id,
          queue_id: draft.queue_id || undefined,
          visit_date: draft.visit_date,
          visit_type: draft.visit_type,
          body_condition_score: draft.body_condition_score ? Number(draft.body_condition_score) : undefined,
          temperature: draft.temperature ? Number(draft.temperature) : undefined,
          heart_rate: draft.heart_rate ? Number(draft.heart_rate) : undefined,
          respiratory_rate: draft.respiratory_rate ? Number(draft.respiratory_rate) : undefined,
          weight: draft.weight ? Number(draft.weight) : undefined,
          chief_complaint: draft.chief_complaint || undefined,
          physical_exam_notes: draft.physical_exam_notes || undefined,
          diagnosis: draft.diagnosis || undefined,
          treatment: draft.treatment || undefined,
          notes: draft.notes || undefined,
          lab_results: draft.lab_results || undefined,
          follow_up_date: draft.follow_up_date || undefined,
        }),
      })
      const mrData = await mrRes.json()

      // Create prescription if items exist
      if (draft.prescriptionItems.length > 0) {
        await fetch('/api/prescriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinic_id: draft.clinic_id,
            customer_id: draft.customer_id,
            pet_id: draft.pet_id,
            notes: `Prescription for medical record ${mrData.data?.id || ''}`,
            items: draft.prescriptionItems.map((item: any) => ({
              medicine_id: item.medicine_id,
              dosage: item.dosage,
              quantity: item.quantity,
              instructions: item.instructions,
            })),
          }),
        })
      }

      // Clear draft
      localStorage.removeItem(STORAGE_KEY)
      router.push('/')
    } catch (err) {
      alert('Failed to save medical record')
    } finally {
      setSaving(false)
    }
  }

  if (loadingMeta) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Medical Record</h1>
        {lastSaved && (
          <Badge variant="outline" className="text-xs">
            Draft saved at {lastSaved}
          </Badge>
        )}
      </div>

      {/* Patient Selection */}
      <Card className="p-4 mb-4">
        <h2 className="font-semibold mb-3">Patient Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Customer</label>
            <select
              className="w-full border rounded-md p-2 text-sm mt-1"
              value={draft.customer_id}
              onChange={(e) => updateField('customer_id', e.target.value)}
            >
              <option value="">Select customer...</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Pet</label>
            <select
              className="w-full border rounded-md p-2 text-sm mt-1"
              value={draft.pet_id}
              onChange={(e) => updateField('pet_id', e.target.value)}
            >
              <option value="">Select pet...</option>
              {pets.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Clinic ID</label>
            <Input
              value={draft.clinic_id}
              onChange={(e) => updateField('clinic_id', e.target.value)}
              placeholder="Clinic UUID"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Queue ID (optional)</label>
            <Input
              value={draft.queue_id}
              onChange={(e) => updateField('queue_id', e.target.value)}
              placeholder="Queue UUID"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Visit Date</label>
            <Input
              type="date"
              value={draft.visit_date}
              onChange={(e) => updateField('visit_date', e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Visit Type</label>
            <select
              className="w-full border rounded-md p-2 text-sm mt-1"
              value={draft.visit_type}
              onChange={(e) => updateField('visit_type', e.target.value)}
            >
              {VISIT_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value}>{vt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabs: Physical Exam, Findings, Prescription */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="physical">Physical Exam</TabsTrigger>
          <TabsTrigger value="findings">Findings & Diagnosis</TabsTrigger>
          <TabsTrigger value="prescription">Prescription</TabsTrigger>
        </TabsList>

        <TabsContent value="physical">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Physical Examination</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Body Condition Score (1-9)</label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={draft.body_condition_score}
                  onChange={(e) => updateField('body_condition_score', e.target.value)}
                  placeholder="1-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Temperature (°C)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={draft.temperature}
                  onChange={(e) => updateField('temperature', e.target.value)}
                  placeholder="e.g. 38.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Heart Rate (bpm)</label>
                <Input
                  type="number"
                  value={draft.heart_rate}
                  onChange={(e) => updateField('heart_rate', e.target.value)}
                  placeholder="e.g. 80"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Respiratory Rate (/min)</label>
                <Input
                  type="number"
                  value={draft.respiratory_rate}
                  onChange={(e) => updateField('respiratory_rate', e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Weight (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.weight}
                  onChange={(e) => updateField('weight', e.target.value)}
                  placeholder="e.g. 12.5"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium">Physical Exam Notes</label>
              <Textarea
                value={draft.physical_exam_notes}
                onChange={(e) => updateField('physical_exam_notes', e.target.value)}
                placeholder="General appearance, mucous membranes, lymph nodes, auscultation findings..."
                rows={3}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="findings">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Findings & Diagnosis</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Chief Complaint</label>
                <Textarea
                  value={draft.chief_complaint}
                  onChange={(e) => updateField('chief_complaint', e.target.value)}
                  placeholder="Reason for visit..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Diagnosis</label>
                <Textarea
                  value={draft.diagnosis}
                  onChange={(e) => updateField('diagnosis', e.target.value)}
                  placeholder="Primary diagnosis..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Treatment Plan</label>
                <Textarea
                  value={draft.treatment}
                  onChange={(e) => updateField('treatment', e.target.value)}
                  placeholder="Treatment plan..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Lab Results</label>
                <Textarea
                  value={draft.lab_results}
                  onChange={(e) => updateField('lab_results', e.target.value)}
                  placeholder="Lab test results..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Additional Notes</label>
                <Textarea
                  value={draft.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Follow-up Date</label>
                <Input
                  type="date"
                  value={draft.follow_up_date}
                  onChange={(e) => updateField('follow_up_date', e.target.value)}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prescription">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Prescription</h2>
            <PrescriptionBuilder
              items={draft.prescriptionItems}
              onChange={(items) => {
                const updated = { ...draft, prescriptionItems: items }
                setDraft(updated)
                saveDraft(updated)
              }}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit */}
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save Medical Record'}
        </Button>
      </div>
    </div>
  )
}