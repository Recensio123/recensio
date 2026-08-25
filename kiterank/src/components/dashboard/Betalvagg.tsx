'use client'
import { useLang } from '@/components/LanguageProvider'
import { AbonnemangTab } from '@/app/(kiterank)/dashboard/settings/AbonnemangTab'
import type { KontoLäge, Plan, Intervall, Priser } from '@/lib/betalning'

/*
 * Vad kunden möter när kontot inte längre betalar.
 *
 * Inte en avstängningsskylt. Den som står här är någon vi vill ha kvar, och
 * enda skälet att visa något alls är att göra köpet lätt — därför ligger
 * paketen med köpknappar direkt på skärmen i stället för bakom en länk.
 * Ett steg mellan "jag vill fortsätta" och kassan är ett steg där folk
 * försvinner.
 *
 * Ingenting är raderat, och det står utskrivet. Rädslan som får en salong att
 * inte betala är sällan priset — det är att sidan och bokningarna ska vara
 * borta när de kommer tillbaka.
 */

const T = {
  sv: {
    rubrik: {
      'prov-slut': 'Din provperiod har tagit slut',
      uppsagd:     'Ditt abonnemang är uppsagt',
      förfallen:   'Vi fick inte betalningen att gå igenom',
    } as Record<string, string>,
    ingress: {
      'prov-slut': 'Välj ett paket nedan så öppnas panelen igen direkt. Allt du byggt under provet står kvar precis som du lämnade det.',
      uppsagd:     'Välj ett paket nedan för att öppna kontot igen. Din hemsida, dina tjänster och din bokningshistorik finns kvar.',
      förfallen:   'Efter flera försök gick kortet inte igenom. Välj ett paket eller uppdatera kortet, så öppnas panelen igen.',
    } as Record<string, string>,
    kvar:   'Ingenting har raderats',
    kvarOm: 'Hemsidan, tjänsterna, personalen och hela bokningshistoriken ligger kvar. Betalar du igen är allt på plats som förut.',
    hjälp:  'Frågor? Hör av dig till oss så löser vi det.',
  },
  en: {
    rubrik: {
      'prov-slut': 'Your trial has ended',
      uppsagd:     'Your subscription has been cancelled',
      förfallen:   'We could not process your payment',
    } as Record<string, string>,
    ingress: {
      'prov-slut': 'Pick a plan below and the dashboard reopens immediately. Everything you built during the trial is exactly as you left it.',
      uppsagd:     'Pick a plan below to reopen your account. Your website, services and booking history are still here.',
      förfallen:   'After several attempts the card did not go through. Pick a plan or update your card and the dashboard reopens.',
    } as Record<string, string>,
    kvar:   'Nothing has been deleted',
    kvarOm: 'Your website, services, staff and full booking history remain. Pay again and everything is right where it was.',
    hjälp:  'Questions? Get in touch and we will sort it out.',
  },
}

export function Betalvagg({ läge, plan, harBokning, bokningTill, intervall, datum, harStripeKund, priser }: {
  läge:  KontoLäge
  plan:  Plan | null
  harBokning: boolean
  bokningTill: string | null
  /* Betalväggen visar bara paketen. Ett köat byte eller en förfrågan hör till
     ett löpande abonnemang, och den som står här har inget. */
  intervall: Intervall | null
  datum: string
  harStripeKund: boolean
  priser: Priser
}) {
  const { lang } = useLang()
  const t = T[lang]
  const sort = läge === 'uppsagd' ? 'uppsagd' : läge === 'förfallen' ? 'förfallen' : 'prov-slut'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">{t.rubrik[sort]}</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-2xl">{t.ingress[sort]}</p>
      </div>

      <div className="bg-navy-900 border border-navy-700 rounded-2xl p-5">
        <h2 className="text-white font-semibold text-sm">{t.kvar}</h2>
        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{t.kvarOm}</p>
      </div>

      {/* Samma kort som i inställningarna. Ett andra, egenbyggt urval här hade
          garanterat glidit isär från det riktiga vid nästa prisändring. */}
      <AbonnemangTab
        läge={läge}
        plan={plan}
        harBokning={harBokning}
        bokningTill={bokningTill}
        intervall={intervall}
        datum={datum}
        harStripeKund={harStripeKund}
        priser={priser}
        utanLäge
      />

      <p className="text-slate-500 text-xs">
        {t.hjälp}
      </p>
    </div>
  )
}
