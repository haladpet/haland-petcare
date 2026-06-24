"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface Medicine {
  id: string
  name: string
  description: string | null
  unit: string | null
  price: string
  current_stock: number
}

interface PrescriptionItem {
  medicine_id: string
  medicine_name: string
  dosage: string
  quantity: number
  instructions: string
  unit: string | null
  price: string
  current_stock: number
}

interface PrescriptionBuilderProps {
  items: PrescriptionItem[]
  onChange: (items: PrescriptionItem[]) => void
}

export default function PrescriptionBuilder({ items, onChange }: PrescriptionBuilderProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Medicine[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const searchMedicines = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(q)}`)
      const json = await res.json()
      setResults(json.data || [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchMedicines(search)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, searchMedicines])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addItem = (med: Medicine) => {
    const existing = items.find((i) => i.medicine_id === med.id)
    if (existing) {
      onChange(
        items.map((i) =>
          i.medicine_id === med.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      )
    } else {
      onChange([
        ...items,
        {
          medicine_id: med.id,
          medicine_name: med.name,
          dosage: '',
          quantity: 1,
          instructions: '',
          unit: med.unit,
          price: med.price,
          current_stock: med.current_stock,
        },
      ])
    }
    setSearch('')
    setShowResults(false)
  }

  const removeItem = (medicineId: string) => {
    onChange(items.filter((i) => i.medicine_id !== medicineId))
  }

  const updateItem = (medicineId: string, field: keyof PrescriptionItem, value: string | number) => {
    onChange(
      items.map((i) =>
        i.medicine_id === medicineId ? { ...i, [field]: value } : i
      )
    )
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative">
        <label className="text-sm font-medium mb-1 block">Search Medicine</label>
        <Input
          placeholder="Type medicine name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
        />
        {showResults && (search.length > 0 || results.length > 0) && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg">
            {searching && <div className="p-3 text-sm text-muted-foreground">Searching...</div>}
            {!searching && results.length === 0 && search.length > 0 && (
              <div className="p-3 text-sm text-muted-foreground">No medicines found</div>
            )}
            {results.map((med) => (
              <button
                key={med.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between"
                onClick={() => addItem(med)}
              >
                <div>
                  <div className="font-medium text-sm">{med.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {med.unit && `${med.unit} • `}Rp {Number(med.price).toLocaleString('id-ID')}
                  </div>
                </div>
                <Badge variant={med.current_stock > 0 ? 'outline' : 'destructive'}>
                  Stock: {med.current_stock}
                </Badge>
              </button>
            ))}
          </Card>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Prescription Items</h4>
          {items.map((item) => (
            <Card key={item.medicine_id} className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-sm">{item.medicine_name}</span>
                  {item.unit && (
                    <span className="text-xs text-muted-foreground ml-2">({item.unit})</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => removeItem(item.medicine_id)}
                >
                  ×
                </Button>
              </div>

              {item.current_stock < item.quantity && (
                <Badge variant="destructive" className="mb-2 text-xs">
                  ⚠ Stock ({item.current_stock}) < requested ({item.quantity}) — will be validated at payment
                </Badge>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Dosage</label>
                  <Input
                    size={1}
                    placeholder="e.g. 2x1"
                    value={item.dosage}
                    onChange={(e) => updateItem(item.medicine_id, 'dosage', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Qty</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.medicine_id, 'quantity', Math.max(1, Number(e.target.value) || 1))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Price/Unit</label>
                  <div className="h-8 flex items-center text-sm">
                    Rp {Number(item.price).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <label className="text-xs text-muted-foreground">Instructions</label>
                <Input
                  placeholder="e.g. After meals"
                  value={item.instructions}
                  onChange={(e) => updateItem(item.medicine_id, 'instructions', e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}