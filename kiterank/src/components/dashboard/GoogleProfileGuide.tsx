'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import { ExternalLink } from '@/components/ExternalLink'

/*
 * Getting a Google Business Profile in place. Signing in with Google connects
 * an account; it does not create a profile, and a salon without one has
 * nothing for us to read.
 *
 * Deliberately one action per situation rather than a checklist: Google walks
 * them through verification and setup themselves once they are in the right
 * place. Repeating those steps here would only be a worse copy of it.
 *
 * Shared between the setup flow and the connections page, because that is
 * where the question actually comes up.
 */

export type GbpState = 'unknown' | 'mine' | 'unclaimed' | 'missing'

const STATE_KEY = 'kiterank_gbp_state'

/** Anything that takes the customer off the dashboard — Google itself, or the
 *  sign-in that redirects there — opens in its own tab. */
const leavesDashboard = (href: string) => href.startsWith('http') || href.startsWith('/api/')

const T = {
  sv: {
    lookupTitle:  'Finns salongen redan på Google?',
    lookupSub:    'Väldigt många salonger ligger redan på kartan utan att ägaren lagt upp dem — Google skapar dem själv. Tryck på knappen så söker vi upp din, sen berättar du vad du ser.',
    lookupCta:    'Sök upp min salong på Google →',
    foundTitle:   'Vad hittade du?',
    optMine:      'Den finns och jag äger den redan',
    optMineSub:   'Då är du redo att göra kopplingen',
    optUnclaimed: 'Den finns men den är inte min ännu',
    optUnclaimedSub: 'Rutan visas men du kan inte redigera den',
    optMissing:   'Jag hittar den inte',
    optMissingSub:'Ingen ruta med adress och karta dyker upp',

    mineT:   'Då är du klar — koppla bara kontot',
    mineS:   'Äger du profilen behöver du inte göra något hos Google. Koppla kontot så hämtar vi in den, och det som saknas — öppettider, tjänster, foton — fyller du i direkt här i Kiterank.',
    mineCta: 'Koppla Google →',
    mineDoneT:   'Profilen är inläst',
    mineDoneS:   'Vi läser din profil härifrån. Under Din Google-profil ser du vad som saknas och fyller i det direkt — du behöver inte gå till Google.',
    mineDoneCta: 'Se vad som saknas →',

    unclaimedT:   'Ta över profilen',
    unclaimedS:   'Tryck "Gör anspråk på företaget" i rutan till höger om sökresultatet. Alla recensioner följer med, och Google guidar dig genom verifieringen — räkna med 3–5 dagar. Skapa aldrig en ny profil när det redan finns en.',
    unclaimedCta: 'Ta över på Google →',

    missingT:   'Lägg upp salongen',
    missingS:   'Namn, adress, kategorin Frisersalong, telefon och öppettider. Tar ungefär tio minuter och är gratis. Google guidar dig genom verifieringen efteråt.',
    missingCta: 'Lägg upp på Google →',
  },
  en: {
    lookupTitle:  'Is the salon already on Google?',
    lookupSub:    'A lot of salons are already on the map without the owner ever adding them — Google creates them itself. Press the button and we look yours up, then tell us what you see.',
    lookupCta:    'Look up my salon on Google →',
    foundTitle:   'What did you find?',
    optMine:      'It is there and I already own it',
    optMineSub:   'Then you are ready to connect',
    optUnclaimed: 'It is there but it is not mine yet',
    optUnclaimedSub: 'The panel shows but you cannot edit it',
    optMissing:   'I cannot find it',
    optMissingSub:'No panel with an address and map appears',

    mineT:   'Then you are set — just connect the account',
    mineS:   'If you own the profile there is nothing to do at Google. Connect the account and we pull it in, and whatever is missing — hours, services, photos — you fill in right here in Kiterank.',
    mineCta: 'Connect Google →',
    mineDoneT:   'The profile is loaded',
    mineDoneS:   'We read your profile from here. Under Your Google profile you can see what is missing and fill it in directly — no need to go to Google.',
    mineDoneCta: 'See what is missing →',

    unclaimedT:   'Claim the profile',
    unclaimedS:   'Click "Claim this business" in the panel to the right of the search result. Every review comes with it, and Google walks you through verification — expect 3–5 days. Never create a second profile when one already exists.',
    unclaimedCta: 'Claim it on Google →',

    missingT:   'Add the salon',
    missingS:   'Name, address, the Hair salon category, phone, and opening hours. Takes about ten minutes and is free. Google walks you through verification afterwards.',
    missingCta: 'Add it on Google →',
  },
}

export function GoogleProfileGuide({
  salonName = '',
  city = '',
  isConnected = false,
  onStateChange,
}: {
  salonName?:   string
  city?:        string
  isConnected?: boolean
  onStateChange?: (s: GbpState) => void
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [state, setState] = useState<GbpState>('unknown')

  useEffect(() => {
    try {
      const s = localStorage.getItem(STATE_KEY) as GbpState | null
      if (s) { setState(s); onStateChange?.(s) }
    } catch { /* first run */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pick(s: GbpState) {
    setState(s)
    localStorage.setItem(STATE_KEY, s)
    onStateChange?.(s)
  }

  const query  = encodeURIComponent([salonName, city].filter(Boolean).join(' '))
  const search = `https://www.google.com/search?q=${query}`

  // Owning the profile means there is nothing to do at Google — connect it and
  // the editing happens here. Claiming and creating are the only things Google
  // will not let us do on their behalf.
  const result =
    state === 'mine'
      ? isConnected
        ? { title: t.mineDoneT, body: t.mineDoneS, cta: t.mineDoneCta, href: '/dashboard/gbp' }
        : { title: t.mineT,     body: t.mineS,     cta: t.mineCta,     href: '/api/auth/google' }
    : state === 'unclaimed' ? { title: t.unclaimedT, body: t.unclaimedS, cta: t.unclaimedCta, href: search } :
      state === 'missing'   ? { title: t.missingT,   body: t.missingS,   cta: t.missingCta,   href: 'https://business.google.com/create' } :
                              null

  return (
    <div className="space-y-4">

      <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 sm:p-5">
        <p className="text-sm font-medium text-white">{t.lookupTitle}</p>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{t.lookupSub}</p>
        <ExternalLink
          href={search}
          className="inline-block mt-3 bg-mustard hover:bg-mustard/90 text-navy-950 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {t.lookupCta}
        </ExternalLink>
      </div>

      <div>
        <p className="text-sm font-medium text-white mb-2">{t.foundTitle}</p>
        <div className="space-y-2">
          {([
            ['mine',      t.optMine,      t.optMineSub],
            ['unclaimed', t.optUnclaimed, t.optUnclaimedSub],
            ['missing',   t.optMissing,   t.optMissingSub],
          ] as [GbpState, string, string][]).map(([v, label, sub]) => (
            <button
              key={v}
              onClick={() => pick(v)}
              className={`w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                state === v ? 'bg-mustard/10 border-mustard' : 'bg-navy-800 border-navy-700 hover:border-navy-600'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                state === v ? 'border-mustard bg-mustard' : 'border-navy-600'
              }`} />
              <span>
                <span className={`block text-sm font-medium ${state === v ? 'text-mustard' : 'text-white'}`}>{label}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* One action, not a checklist — Google takes it from here */}
      {result && (
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-semibold text-white">{result.title}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{result.body}</p>
          </div>
          {leavesDashboard(result.href) ? (
            <ExternalLink
              href={result.href}
              className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-mustard hover:bg-mustard/90 text-navy-950 transition-colors"
            >
              {result.cta}
            </ExternalLink>
          ) : (
            <Link
              href={result.href}
              className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-mustard hover:bg-mustard/90 text-navy-950 transition-colors"
            >
              {result.cta}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
