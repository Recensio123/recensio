'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

/*
 * Dörren in — och bara in.
 *
 * Sidan hade tidigare ett registreringsläge: e-post, lösenord, företagsnamn.
 * Guiden frågade sedan om namnet och adressen igen, och den som kom utan att
 * ha valt paket blev tyst insorterad i mallflödet — utan att någonsin ha sett
 * att det fanns två andra.
 *
 * Nu bor registreringen i /onboarding, där kontot är steg 1 av tre och
 * paketvalet står först för den som inte redan valt. Här finns inloggningen
 * och ingenting annat.
 */

function LoginInnehåll() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [laddar,   setLaddar]   = useState(false)
  const [besked,   setBesked]   = useState('')
  const router = useRouter()
  const params = useSearchParams()

  /* Paketet kunden klickade på, om de kom via startsidan. */
  const paket = params.get('paket')
  const vidare = paket === 'design' || paket === 'fullservice'
    ? `/onboarding?paket=${paket}`
    : '/dashboard'

  async function loggaInMedGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?vidare=${encodeURIComponent(vidare)}` },
    })
  }

  async function skicka(e: React.FormEvent) {
    e.preventDefault()
    setLaddar(true)
    setBesked('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setBesked(error.message) }
    else { router.push(vidare); router.refresh() }
    setLaddar(false)
  }

  const fält = 'w-full px-4 py-3 rounded-lg bg-navy-800 border border-navy-600 text-white placeholder-slate-500 focus:outline-none focus:border-mustard text-sm'

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Kiterank</h1>
          <p className="text-slate-400 mt-1 text-sm">Logga in på ditt konto</p>
        </div>

        <button
          type="button"
          onClick={loggaInMedGoogle}
          className="w-full py-3 rounded-lg bg-navy-800 border border-navy-600 hover:border-slate-400 text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-colors"
        >
          <span className="font-bold text-base leading-none">G</span>
          Fortsätt med Google
        </button>

        <div className="relative flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-navy-700" />
          <span className="text-xs text-slate-600">eller</span>
          <div className="flex-1 border-t border-navy-700" />
        </div>

        <form onSubmit={skicka} className="space-y-4">
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={fält}
          />
          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className={fält}
          />

          {/*
            * Ingen landsruta här längre.
            *
            * Den skrev till inloggningstjänstens metadata, och ingenting i
            * produkten läste därifrån — allt läser companies.country, som
            * sätts under Inställningar. Ett obligatoriskt fält som inte
            * används är ett hinder utan syfte, och det stod dessutom mellan
            * kunden och deras konto.
            */}

          {besked && <p className="text-sm text-center text-mustard">{besked}</p>}
          <button
            type="submit"
            disabled={laddar}
            className="w-full py-3 rounded-lg bg-mustard hover:bg-mustard-light text-navy-950 font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            {laddar ? 'Ett ögonblick…' : 'Logga in'}
          </button>
        </form>

        {/* Vägen till registreringen går via paketvalet, inte via ett annat
            läge i det här formuläret. Den som inte klickat på ett pris har
            aldrig sett vad vi säljer — och ett konto skapat i blindo landar
            alltid i mallflödet, oavsett vad de var beredda att betala för. */}
        <p className="mt-4 text-center text-sm text-slate-500">
          Har du inget konto?{' '}
          <Link href="/onboarding" className="text-mustard hover:text-mustard-light">
            Skapa ett konto
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  /* useSearchParams kräver en Suspense-gräns i app-routern. */
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-950" />}>
      <LoginInnehåll />
    </Suspense>
  )
}
