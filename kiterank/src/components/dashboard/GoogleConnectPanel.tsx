'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { ExternalLink } from '@/components/ExternalLink'
import { GoogleProfileGuide } from '@/components/dashboard/GoogleProfileGuide'

/*
 * The one place a customer connects Google, wherever they meet it — the
 * connections page, or partway through onboarding. Identical either way, so
 * nobody has to work out whether two differently worded screens mean the same
 * thing.
 *
 * The disclosure underneath exists because signing in connects an account but
 * does not create a Business Profile. Without one there is nothing for us to
 * read, and that dead end has to have a way out right where it is hit.
 */

const FEATURE_ICONS = ['★', '⌕', '◈', '↗']

const T = {
  sv: {
    title:    'Koppla med Google',
    body:     'En enda inloggning kopplar din företagsprofil, Search Console, Google Ads och Analytics.',
    features: [
      'Recensioner & stjärnbetyg',
      'Var du syns i sökresultaten',
      'Annonskostnad & sökord',
      'Besök på hemsidan',
    ],
    button:   'Koppla med Google →',
    readOnly: 'Vi kan bara läsa — vi publicerar eller ändrar aldrig något åt dig',
    noProfileTitle: 'Har du ingen Google-företagsprofil ännu?',
    noProfileSub:   'Inloggningen kopplar ditt konto, men skapar ingen profil. Saknas den finns det inget att hämta — så börja här.',
    connected: 'Google är kopplat ✓',
  },
  en: {
    title:    'Connect with Google',
    body:     'One sign-in connects your Business Profile, Search Console, Google Ads, and Analytics.',
    features: [
      'Reviews & star rating',
      'Search rankings',
      'Ad spend & keywords',
      'Website traffic',
    ],
    button:   'Connect with Google →',
    readOnly: 'Read-only access — we never post or make changes on your behalf',
    noProfileTitle: 'No Google Business Profile yet?',
    noProfileSub:   'Signing in connects your account, but it does not create a profile. Without one there is nothing to pull in — so start here.',
    connected: 'Google is connected ✓',
  },
}

export function GoogleConnectPanel({
  salonName = '',
  city = '',
  isConnected = false,
}: {
  salonName?:   string
  city?:        string
  isConnected?: boolean
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [showGuide, setShowGuide] = useState(false)

  if (isConnected) {
    return <p className="text-sm text-green-400">{t.connected}</p>
  }

  return (
    <div className="bg-navy-800 rounded-2xl border border-mustard/20 p-5 sm:p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-mustard/15 flex items-center justify-center text-2xl mx-auto">G</div>
        <p className="text-white font-semibold text-lg">{t.title}</p>
        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">{t.body}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {t.features.map((label, i) => (
          <div key={label} className="bg-navy-700/50 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-mustard text-base">{FEATURE_ICONS[i]}</span>
            <span className="text-slate-300 text-sm">{label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {/* Opens in its own tab so the dashboard stays where it was — the
            sign-in happens at Google, not here. */}
        <ExternalLink
          href="/api/auth/google"
          className="w-full bg-mustard hover:bg-mustard-light text-navy-950 font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {t.button}
        </ExternalLink>
        <p className="text-center text-slate-500 text-xs">{t.readOnly}</p>
      </div>

      <div className="border-t border-navy-700 pt-5">
        <button
          onClick={() => setShowGuide(v => !v)}
          className="w-full text-left flex items-center justify-between gap-3"
        >
          <span>
            <span className="block text-sm font-medium text-white">{t.noProfileTitle}</span>
            <span className="block text-xs text-slate-400 mt-0.5 leading-relaxed">{t.noProfileSub}</span>
          </span>
          <span className="text-slate-400 text-xs shrink-0">{showGuide ? '▲' : '▼'}</span>
        </button>
        {showGuide && (
          <div className="mt-4">
            <GoogleProfileGuide salonName={salonName} city={city} isConnected={isConnected} />
          </div>
        )}
      </div>
    </div>
  )
}
