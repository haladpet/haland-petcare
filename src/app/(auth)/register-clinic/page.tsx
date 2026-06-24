"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterClinicPage() {
  const router = useRouter()
  const [clinicName, setClinicName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register-clinic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clinic_name: clinicName, email, password, full_name: fullName }) })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      router.push('/(auth)/login')
    } catch (err: any) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-20">
      <h1 className="text-2xl font-semibold mb-4">Register Clinic</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Clinic name" className="w-full input" />
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="w-full input" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full input" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full input" />
        <button disabled={loading} className="btn">{loading ? 'Creating...' : 'Create clinic'}</button>
        {error && <div className="text-red-600">{error}</div>}
      </form>
    </div>
  )
}
