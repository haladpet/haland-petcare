"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, syncUserToLocalDb } from '@/lib/auth/store'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    const onOnline = () => window.location.reload()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, deviceInfo: { userAgent: navigator.userAgent } }) })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }
      login({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, deviceId: data.deviceId })
      await syncUserToLocalDb(data.user)
      router.push('/')
    } catch (err: any) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-20" data-testid="login-page">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      {!isOnline && <div className="mb-4 text-yellow-700" data-testid="offline-banner">You are offline — offline login may be available.</div>}
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
        <input data-testid="email-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full input" />
        <input data-testid="password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full input" />
        <button data-testid="login-submit-button" disabled={loading} className="btn">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        {error && <div className="text-red-600" data-testid="login-error">{error}</div>}
      </form>
    </div>
  )
}
