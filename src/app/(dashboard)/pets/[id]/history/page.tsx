"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface MedicalRecord {
  id: string
  visit_date: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  created_at: string
}

export default function PetHistoryPage() {
  const params = useParams()
  const petId = params.id as string

  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [pet, setPet] = useState<any>(null)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Load pet info
  useEffect(() => {
    if (!petId) return
    fetch(`/api/pets/${petId}`)
      .then((r) => r.json())
      .then((d) => setPet(d.data || null))
      .catch(() => {})
  }, [petId])

  // Load records
  const loadRecords = useCallback(async (pageNum: number) => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/medical-records?pet_id=${petId}&page=${pageNum}&limit=20`)
      const json = await res.json()
      const newRecords = json.data || []
      const pagination = json.pagination

      if (pageNum === 1) {
        setRecords(newRecords)
      } else {
        setRecords((prev) => [...prev, ...newRecords])
      }

      if (pagination) {
        setHasMore(pageNum < pagination.totalPages)
      } else {
        setHasMore(newRecords.length === 20)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [petId, loading, hasMore])

  // Initial load
  useEffect(() => {
    if (!petId) return
    setPage(1)
    setRecords([])
    setHasMore(true)
    loadRecords(1)
  }, [petId])

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      loadRecords(page)
    }
  }, [page])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => prev + 1)
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [hasMore, loading])

  if (initialLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full mb-3" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Medical History
          {pet && <span className="text-muted-foreground text-lg ml-2">— {pet.name}</span>}
        </h1>
        {pet && (
          <p className="text-sm text-muted-foreground mt-1">
            {pet.species} {pet.breed && `• ${pet.breed}`} {pet.gender && `• ${pet.gender}`}
          </p>
        )}
      </div>

      {records.length === 0 && !loading && (
        <Card className="p-8 text-center text-muted-foreground">
          No medical records found for this pet.
        </Card>
      )}

      <div className="space-y-3">
        {records.map((record) => (
          <Card key={record.id} className="p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-semibold text-sm">
                  {new Date(record.visit_date).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {new Date(record.visit_date).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Badge>
            </div>

            {record.diagnosis && (
              <div className="mb-1">
                <span className="text-xs font-medium text-muted-foreground">Diagnosis:</span>
                <p className="text-sm">{record.diagnosis}</p>
              </div>
            )}

            {record.treatment && (
              <div className="mb-1">
                <span className="text-xs font-medium text-muted-foreground">Treatment:</span>
                <p className="text-sm">{record.treatment}</p>
              </div>
            )}

            {record.notes && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Notes:</span>
                <p className="text-sm text-muted-foreground">{record.notes}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="py-4 text-center">
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}
        {!hasMore && records.length > 0 && (
          <p className="text-sm text-muted-foreground">All records loaded</p>
        )}
      </div>
    </div>
  )
}