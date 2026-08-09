'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

async function signInWithGoogle() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
}

const COUNTRIES = [
  { value: 'sweden',      label: 'Sweden' },
  { value: 'norway',      label: 'Norway' },
  { value: 'denmark',     label: 'Denmark' },
  { value: 'finland',     label: 'Finland' },
  { value: 'germany',     label: 'Germany' },
  { value: 'switzerland', label: 'Switzerland' },
  { value: 'austria',     label: 'Austria' },
  { value: 'netherlands', label: 'Netherlands' },
  { value: 'uk',          label: 'United Kingdom' },
  { value: 'australia',   label: 'Australia' },
  { value: 'us',          label: 'United States' },
  { value: 'canada',      label: 'Canada' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMessage(error.message) }
      else { router.push('/dashboard'); router.refresh() }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { country: country || null } },
      })
      if (error) { setMessage(error.message) }
      else { setMessage('Check your email to confirm your account.') }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Kiterank</h1>
          {mode === 'login' ? (
            <p className="text-slate-400 mt-1 text-sm">Sign in to your account</p>
          ) : (
            <>
              <p className="text-slate-300 mt-1 text-sm font-medium">Turn your Google data into a weekly action plan</p>
              <div className="flex justify-center gap-4 mt-3">
                {['Real rankings', 'Review insights', 'Weekly priorities'].map(item => (
                  <span key={item} className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="text-mustard">✓</span>{item}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full py-3 rounded-lg bg-navy-800 border border-navy-600 hover:border-slate-400 text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors"
        >
          <span className="font-bold text-base leading-none">G</span>
          Continue with Google
        </button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-navy-700" />
          <span className="text-xs text-slate-600">or</span>
          <div className="flex-1 border-t border-navy-700" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-navy-600 text-white placeholder-slate-500 focus:outline-none focus:border-mustard text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-navy-600 text-white placeholder-slate-500 focus:outline-none focus:border-mustard text-sm"
          />

          {mode === 'signup' && (
            <div>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-navy-800 border border-navy-600 text-sm focus:outline-none focus:border-mustard appearance-none cursor-pointer"
                style={{ color: country ? 'white' : 'rgb(100 116 139)' }}
              >
                <option value="" disabled>Country your business operates in</option>
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value} style={{ color: 'white' }}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {message && <p className="text-sm text-center text-mustard">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-mustard hover:bg-mustard-light text-navy-950 font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }} className="text-mustard hover:text-mustard-light">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
