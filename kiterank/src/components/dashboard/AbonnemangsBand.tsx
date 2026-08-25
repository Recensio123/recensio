'use client'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import type { Tillgång } from '@/lib/betalning'

/*
 * Bandet som varnar innan något stängs.
 *
 * Två tillfällen, och båda är sådana där tystnad kostar en kund: provet som
 * går ut om ett par dagar, och kortet som just nekades. Det andra är det
 * viktigaste — Stripe gör omförsök i ett par veckor, och nästan varje sådant
 * fall är ett utgånget kort som kunden fixar på trettio sekunder om de bara
 * får veta. Utan bandet får de veta först den dag panelen är låst.
 *
 * Ligger i flödet överst på sidan, inte som en hörnruta: det som kan sluta med
 * en stängd panel förtjänar sidans bredd.
 */

const T = {
  sv: {
    prov: (d: number) => d === 1
      ? 'Din provperiod tar slut i morgon.'
      : `Din provperiod tar slut om ${d} dagar.`,
    provKnapp:  'Välj paket',
    förfallen:  'Vi fick inte den senaste betalningen att gå igenom — oftast är det ett kort som gått ut.',
    förfallenKnapp: 'Uppdatera betalning',
  },
  en: {
    prov: (d: number) => d === 1
      ? 'Your trial ends tomorrow.'
      : `Your trial ends in ${d} days.`,
    provKnapp:  'Choose a plan',
    förfallen:  'The last payment did not go through — usually that means an expired card.',
    förfallenKnapp: 'Update payment',
  },
}

export function AbonnemangsBand({ tillgång }: { tillgång: Tillgång }) {
  const { lang } = useLang()
  const t = T[lang]

  if (tillgång.varning === 'ingen') return null

  const förfallen = tillgång.varning === 'förfallen'
  const text  = förfallen ? t.förfallen : t.prov(tillgång.dagarKvar ?? 0)
  const knapp = förfallen ? t.förfallenKnapp : t.provKnapp

  return (
    <div className={`px-4 sm:px-8 py-2.5 flex items-center justify-between gap-4 flex-wrap border-b ${
      förfallen
        ? 'bg-red-500/10 border-red-500/20'
        : 'bg-mustard/10 border-mustard/20'
    }`}>
      <p className={`text-sm ${förfallen ? 'text-red-300' : 'text-mustard'}`}>{text}</p>
      <Link
        href="/dashboard/settings?flik=abonnemang"
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-colors ${
          förfallen
            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-200'
            : 'bg-mustard hover:bg-mustard/90 text-navy-950'
        }`}
      >
        {knapp}
      </Link>
    </div>
  )
}
