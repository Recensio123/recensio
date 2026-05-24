'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login')
  const [companyName, setCompanyName] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/dashboard` } })
      if (error) setError(error.message)
      else setMessage('Kolla din e-post för en inloggningslänk!')
    } else if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else location.href = '/dashboard'
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: userName } } })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user) {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, email, name: userName, companyName }),
        })
        setMessage('Konto skapat! Kolla din e-post för att verifiera.')
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f7f3ec)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #e5dfd4', borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 420 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, marginBottom: 4, color: '#0e1410' }}>
          Recens<span style={{ color: '#4d8c68' }}>io</span>
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', marginBottom: '.25rem', marginTop: '1.25rem' }}>
          {mode === 'register' ? 'Skapa konto' : 'Logga in'}
        </h1>
        <p style={{ fontSize: 14, color: '#9c9285', marginBottom: '1.5rem' }}>
          {mode === 'magic' ? 'Vi skickar en inloggningslänk till din e-post.' : ''}
        </p>

        {error && <div style={{ background: '#fdf0ee', color: '#c0392b', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ background: '#deeae3', color: '#2e6649', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: '1rem' }}>{message}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {mode === 'register' && (
            <>
              <input placeholder="Ditt namn" value={userName} onChange={e => setUserName(e.target.value)} style={inputStyle} required />
              <input placeholder="Företagsnamn" value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} required />
            </>
          )}
          <input type="email" placeholder="E-post" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          {mode !== 'magic' && (
            <input type="password" placeholder="Lösenord" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
          )}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Laddar...' : mode === 'register' ? 'Skapa konto' : mode === 'magic' ? 'Skicka länk' : 'Logga in'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#9c9285' }}>
          {mode !== 'login' && <button onClick={() => setMode('login')} style={linkStyle}>← Tillbaka till inloggning</button>}
          {mode === 'login' && <button onClick={() => setMode('register')} style={linkStyle}>Inget konto? Skapa ett →</button>}
          {mode === 'login' && <button onClick={() => setMode('magic')} style={linkStyle}>Logga in med magisk länk</button>}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: '#f7f3ec', border: '1px solid #e5dfd4',
  borderRadius: 8, fontFamily: 'inherit', fontSize: 14, color: '#0e1410', outline: 'none',
}
const btnStyle: React.CSSProperties = {
  width: '100%', background: '#1a3d2b', color: '#fff', border: 'none', padding: 13,
  borderRadius: 10, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4,
}
const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#4d8c68', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 13, textAlign: 'left', padding: 0,
}
