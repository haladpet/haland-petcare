"use client"
import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/auth/store'

export default function DevicesPage() {
  const user = useAuthStore((s) => s.user)
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'OWNER') return
    setLoading(true)
    fetch('/api/auth/devices?userId=' + user.id)
      .then((r) => r.json())
      .then((d) => setDevices(d.devices || []))
      .finally(() => setLoading(false))
  }, [user])

  async function revoke(id: string) {
    await fetch('/api/auth/devices/' + id, { method: 'DELETE' })
    setDevices(devices.filter((d) => d.id !== id))
  }

  if (!user) return <div>Please login</div>
  if (user.role !== 'OWNER') return <div>Access denied</div>

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Devices</h2>
      {loading && <div>Loading...</div>}
      <ul>
        {devices.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">{d.name || 'Unnamed'}</div>
              <div className="text-sm text-muted-foreground">{d.type || ''} • last sync: {d.last_sync_at || '—'}</div>
            </div>
            <button onClick={() => revoke(d.id)} className="btn btn-sm">Revoke</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
