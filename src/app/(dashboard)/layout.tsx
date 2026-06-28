"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import SyncStatusBar from '@/components/shared/sync-status-bar'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊', permission: null },
  { href: '/customers', label: 'Customers', icon: '👥', permission: 'queue_management' },
  { href: '/pets', label: 'Pets', icon: '🐾', permission: 'queue_management' },
  { href: '/queue', label: 'Queue', icon: '🔄', permission: 'queue_management' },
  { href: '/appointments', label: 'Appointments', icon: '📅', permission: 'queue_management' },
  { href: '/medical-records/new', label: 'New Record', icon: '📝', permission: 'medical_records' },
  { href: '/hospitalization/cages', label: 'Cages', icon: '🏥', permission: 'hospitalization' },
  { href: '/pos', label: 'POS', icon: '💳', permission: 'pos_payment' },
  { href: '/inventory', label: 'Inventory', icon: '📦', permission: 'inventory' },
  { href: '/reports', label: 'Reports', icon: '📈', permission: 'reports' },
  { href: '/audit', label: 'Audit Log', icon: '🔍', permission: 'reports' },
  { href: '/conflicts', label: 'Conflicts', icon: '⚠️', permission: 'settings' },
  { href: '/settings/devices', label: 'Devices', icon: '⚙️', permission: 'settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (!user) {
      router.replace('/login')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const filteredNav = navItems.filter((item) => {
    if (!item.permission) return true
    if (!user) return false
    const role = user.role as string
    // Simple permission check based on role
    if (role === 'OWNER') return true
    if (role === 'DOCTOR') return ['queue_management', 'medical_records', 'prescriptions', 'hospitalization', 'reports'].includes(item.permission)
    if (role === 'STAFF') return ['queue_management', 'hospitalization', 'inventory', 'pos_payment', 'reports'].includes(item.permission)
    return false
  })

  return (
    <div className="min-h-screen flex" data-testid="dashboard-layout">
      {/* Sidebar */}
      <aside data-testid="sidebar" className={`${sidebarOpen ? 'w-56' : 'w-14'} bg-background border-r border-border transition-all duration-200 flex flex-col`}>
        <div className="h-14 flex items-center px-3 border-b border-border">
          <button
            data-testid="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-lg font-bold text-primary hover:opacity-80 transition-opacity"
          >
            {sidebarOpen ? '🐾 Haland PC' : '🐾'}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2" data-testid="sidebar-nav">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-border" data-testid="sidebar-user-info">
          {user && (
            <div className={`flex items-center gap-2 ${!sidebarOpen && 'justify-center'}`}>
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              {sidebarOpen && (
                <div className="text-xs truncate">
                  <div className="font-medium" data-testid="user-name">{user.full_name}</div>
                  <div className="text-muted-foreground" data-testid="user-role">{user.role}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-10" data-testid="main-content">
        {children}
      </main>

      {/* Sync Status Bar */}
      <SyncStatusBar />
    </div>
  )
}