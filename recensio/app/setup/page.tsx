'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SetupPage() {
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setLoading(false); return }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        companyName,
      }),
    })

    if (res.ok) {
      window.location.href = '/dashboard'
    } else {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #e5dfd4', borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 420 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, marginBottom: '1.5rem', color: '#0e1410' }}>
          Recens<span style={{ color: '#4d8c68' }}>io</span>
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', marginBottom: '.25rem' }}>Ett steg kvar</h1>
        <p style={{ fontSize: 14, color: '#9c9285', marginBottom: '1.5rem' }}>Vad heter ditt företag?</p>

        {error && <div style={{ background: '#fdf0ee', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            placeholder="Företagsnamn"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 14px', background: '#f7f3ec', border: '1px solid #e5dfd4', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, color: '#0e1410', outline: 'none' }}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', background: '#1a3d2b', color: '#fff', border: 'none', padding: 13, borderRadius: 10, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Skapar...' : 'Kom igång →'}
          </button>
        </form>
      </div>
    </div>
  )
}
