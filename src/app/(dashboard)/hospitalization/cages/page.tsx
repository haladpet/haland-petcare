"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Cage {
  id: string
  code: string
  description: string | null
  type: string | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
}

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 border-green-400 text-green-800',
  OCCUPIED: 'bg-red-100 border-red-400 text-red-800',
  MAINTENANCE: 'bg-yellow-100 border-yellow-400 text-yellow-800',
}

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  OCCUPIED: 'bg-red-500',
  MAINTENANCE: 'bg-yellow-500',
}

export default function CagesPage() {
  const [cages, setCages] = useState<Cage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCages()
  }, [])

  async function loadCages() {
    try {
      const res = await fetch('/api/hospitalizations/cages')
      const json = await res.json()
      setCages(json.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Cages</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const available = cages.filter((c) => c.status === 'AVAILABLE').length
  const occupied = cages.filter((c) => c.status === 'OCCUPIED').length
  const maintenance = cages.filter((c) => c.status === 'MAINTENANCE').length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cages</h1>
        <div className="flex gap-3">
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {available} Available
          </Badge>
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {occupied} Occupied
          </Badge>
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            {maintenance} Maintenance
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {cages.map((cage) => (
          <Card
            key={cage.id}
            className={`p-4 border-2 transition-all hover:shadow-md ${STATUS_COLORS[cage.status] || 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">{cage.code}</span>
              <span className={`w-3 h-3 rounded-full ${STATUS_DOT[cage.status]}`} />
            </div>
            {cage.type && (
              <p className="text-xs opacity-70 mb-1">{cage.type}</p>
            )}
            {cage.description && (
              <p className="text-xs opacity-60 line-clamp-2">{cage.description}</p>
            )}
            <div className="mt-3">
              <Badge
                variant="secondary"
                className={`text-xs ${
                  cage.status === 'AVAILABLE'
                    ? 'bg-green-100 text-green-700'
                    : cage.status === 'OCCUPIED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {cage.status}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {cages.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No cages found. Create cages to start admitting patients.
        </Card>
      )}
    </div>
  )
}