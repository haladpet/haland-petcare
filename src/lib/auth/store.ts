import { create } from 'zustand'
import { verifyToken } from '@/lib/auth/jwt'
import type { AuthPayload } from '@/types/auth'

type User = { id: string; email: string; full_name?: string; role?: string; clinic_id?: string } | null

type AuthState = {
  user: User
  accessToken: string | null
  refreshToken: string | null
  deviceId?: string | null
  isOnline: boolean
  login: (data: { user: User; accessToken: string; refreshToken: string; deviceId?: string }) => void
  logout: () => void
  refreshSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  login: (data) => {
    set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, deviceId: data.deviceId || null })
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth:user', JSON.stringify(data.user))
      localStorage.setItem('auth:accessToken', data.accessToken)
      localStorage.setItem('auth:refreshToken', data.refreshToken)
      if (data.deviceId) localStorage.setItem('auth:deviceId', data.deviceId)
      localStorage.setItem('auth:lastActivity', String(Date.now()))
    }
  },
  logout: () => {
    set({ user: null, accessToken: null, refreshToken: null, deviceId: null })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth:user')
      localStorage.removeItem('auth:accessToken')
      localStorage.removeItem('auth:refreshToken')
      localStorage.removeItem('auth:deviceId')
      localStorage.removeItem('auth:lastActivity')
    }
  },
  refreshSession: async () => {
    const refreshToken = localStorage.getItem('auth:refreshToken')
    if (!refreshToken) return
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) })
      if (!res.ok) {
        get().logout()
        return
      }
      const data = await res.json()
      localStorage.setItem('auth:accessToken', data.accessToken)
      set({ accessToken: data.accessToken })
    } catch (err) {
      console.error('refreshSession error', err)
    }
  },
}))

// auto refresh before expiry
if (typeof window !== 'undefined') {
  setInterval(async () => {
    const token = localStorage.getItem('auth:accessToken')
    if (!token) return
    const payload = await verifyToken(token)
    if (!payload) return
    const exp = payload.exp ? Number(payload.exp) * 1000 : 0
    const now = Date.now()
    const ttl = exp - now
    if (ttl < 5 * 60 * 1000) {
      // less than 5 minutes
      const store = useAuthStore.getState()
      await store.refreshSession()
    }
  }, 60 * 1000)
}

export async function syncUserToLocalDb(user: User) {
  // placeholder: store user in localStorage until local DB client is implemented
  if (!user) return
  localStorage.setItem('local_user:' + user.id, JSON.stringify(user))
}
