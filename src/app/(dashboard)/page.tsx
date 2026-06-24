"use client"

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth/store'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const clinicId = user?.clinic_id
        if (!clinicId) return
        const res = await fetch(`/api/reports/summary?clinic_id=${clinicId}`)
        const json = await res.json()
        setStats(json.data || null)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.role === 'OWNER' ? 'Clinic Owner' : user?.role === 'DOCTOR' ? 'Doctor' : 'Staff'} • {user?.clinic_id?.slice(0, 8)}...
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Customers</div>
              <div className="text-3xl font-bold">{stats.totalCustomers}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Pets</div>
              <div className="text-3xl font-bold">{stats.totalPets}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Active Hospitalizations</div>
              <div className="text-3xl font-bold">{stats.activeHospitalizations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Pending Invoices</div>
              <div className="text-3xl font-bold">
                Rp {Number(stats.pendingInvoicesTotal || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-muted-foreground">{stats.pendingInvoicesCount} invoices</div>
            </Card>
          </>
        ) : (
          <Card className="p-8 col-span-full text-center text-muted-foreground">
            No data available. Start by adding customers and pets.
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickActionCard
          title="New Medical Record"
          description="Create a new examination record for a pet"
          href="/medical-records/new"
          icon="📝"
        />
        <QuickActionCard
          title="Manage Queue"
          description="View and manage patient queue"
          href="/queue"
          icon="🔄"
        />
        <QuickActionCard
          title="View Cages"
          description="Check cage availability and occupancy"
          href="/hospitalization/cages"
          icon="🏥"
        />
        <QuickActionCard
          title="Point of Sale"
          description="Process payments and invoices"
          href="/pos"
          icon="💳"
        />
        <QuickActionCard
          title="Inventory"
          description="Manage medicines and supplies"
          href="/inventory"
          icon="📦"
        />
        <QuickActionCard
          title="Reports"
          description="View clinic analytics and reports"
          href="/reports"
          icon="📈"
        />
      </div>
    </div>
  )
}

function QuickActionCard({ title, description, href, icon }: {
  title: string
  description: string
  href: string
  icon: string
}) {
  return (
    <a href={href} className="block">
      <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </Card>
    </a>
  )
}