'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { AbonnemangTab } from './AbonnemangTab'
import type { KontoLäge, Plan, Intervall, Priser } from '@/lib/betalning'

/*
 * Inställningarnas två flikar: företaget och abonnemanget.
 *
 * Företagsformuläret kommer in som children från serversidan — det är redan en
 * färdig komponent med sin egen data, och den ska inte byggas om för att sidan
 * fick flikar. Abonnemanget ritas härifrån med de värden servern läst.
 *
 * Startfliken styrs av adressen (?flik=abonnemang), så att kassans återhopp
 * landar rätt: den som just betalat ska se sitt kvitterade läge, inte
 * företagsformuläret.
 */

type Flik = 'foretag' | 'abonnemang'

const T = {
  sv: { foretag: 'Företag', abonnemang: 'Abonnemang' },
  en: { foretag: 'Business', abonnemang: 'Subscription' },
}

export function InstallningarFlikar({ startFlik, abonnemang, children }: {
  startFlik: Flik
  /** Null när betalmigrationen inte är körd — då finns bara företagsfliken. */
  abonnemang: {
    läge:  KontoLäge
    plan:  Plan | null
    harBokning: boolean
    bokningTill: string | null
    byte: { till: Plan; datum: string } | null
    förfrågan: Plan | null
    avbetald: boolean
    intervall: Intervall | null
    datum: string
    harStripeKund: boolean
    priser: Priser
    kvitto?: 'klar' | 'avbruten' | null
  } | null
  children: React.ReactNode
}) {
  const { lang } = useLang()
  const t = T[lang]
  const [flik, setFlik] = useState<Flik>(abonnemang ? startFlik : 'foretag')

  if (!abonnemang) return <>{children}</>

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1 w-fit">
        {(['foretag', 'abonnemang'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFlik(f)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              flik === f ? 'bg-mustard/15 text-mustard' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t[f]}
          </button>
        ))}
      </div>

      {flik === 'foretag' ? <div className="space-y-6">{children}</div> : <AbonnemangTab {...abonnemang} />}
    </div>
  )
}
