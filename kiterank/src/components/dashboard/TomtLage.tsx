import Link from 'next/link'
import type { Källa, Dataläge } from '@/lib/datalage'

/*
 * Vad en vy visar när det inte finns något att visa.
 *
 * En enda komponent, medvetet. Låter man varje flik hitta på sitt eget tomma
 * läge får man fjorton olika sätt att säga samma sak, och kunden som är ny på
 * det här lär sig aldrig känna igen mönstret — varje tom sida blir ett nytt
 * problem att tolka i stället för samma sak igen.
 *
 * Två utgångar, alltid: en som förklarar och en som gör något. Den som inte
 * förstår varför siffrorna saknas behöver läsa; den som förstår vill koppla
 * och gå vidare. En tom sida med bara ett konstaterande lämnar båda kvar.
 *
 * Och tonen: "det finns ingen data" är ett konstaterande om oss. "Du ser det
 * här när du kopplat din profil" är ett besked om vad kunden får. Det senare,
 * alltid.
 */

type Text = {
  /* Vad de går miste om — i vad de får veta, inte i vad tekniken heter. */
  rubrik:  string
  om:      string
  /* Vad knappen gör. Saknas den är läget vår sak att lösa, inte kundens. */
  knapp?:  { text: string; href: string }
  guide:   { text: string; href: string }
}

const EJ_KOPPLAT: Record<Källa, Text> = {
  gbp: {
    rubrik: 'Koppla din Google-företagsprofil',
    om:     'Då ser du hur många som hittar dig på Google, vad de sökte på för att komma fram, och vilka omdömen som kommit in.',
    knapp:  { text: 'Koppla Google', href: '/api/auth/google' },
    guide:  { text: 'Så fungerar din Google-profil', href: '/dashboard/support/google-profil' },
  },
  search: {
    rubrik: 'Koppla mätningen av dina sökningar',
    om:     'Då ser du vilka sökord som leder folk till din sida, hur högt du ligger på dem, och vilka som är på väg upp.',
    knapp:  { text: 'Koppla Google', href: '/api/auth/google' },
    guide:  { text: 'Så syns du på Google', href: '/dashboard/support/synlighet' },
  },
  ads: {
    rubrik: 'Koppla ditt annonskonto',
    om:     'Då ser du vad annonserna kostar, vad de ger tillbaka, och vilka sökord som slösar pengar.',
    knapp:  { text: 'Koppla Google Ads', href: '/api/auth/google' },
    guide:  { text: 'Så fungerar annonsering', href: '/dashboard/support/annonser' },
  },
  website: {
    rubrik: 'Mätningen är inte igång på din sida',
    om:     'Då ser du hur många som besöker sidan, var de kommer ifrån, och var de hoppar av innan de bokar.',
    knapp:  { text: 'Koppla Google', href: '/api/auth/google' },
    guide:  { text: 'Så mäter du din hemsida', href: '/dashboard/support/webbplats' },
  },
}

/* Kopplat, men ännu inget att visa. Google fyller inte i historik i efterhand:
   mätningen börjar den dag den sätts upp, så det här läget är väntan och inget
   fel. Ingen knapp, eftersom det inte finns något kunden kan göra åt det. */
const FÖR_NYTT: Record<Källa, Text> = {
  gbp: {
    rubrik: 'Vi har börjat hämta din data',
    om:     'Första siffrorna från din Google-profil dyker upp inom ett dygn.',
    guide:  { text: 'Så fungerar din Google-profil', href: '/dashboard/support/google-profil' },
  },
  search: {
    rubrik: 'Google har börjat logga dina sökningar',
    om:     'Räkna med ungefär en vecka innan det finns tillräckligt för att läsa ut ett mönster.',
    guide:  { text: 'Så syns du på Google', href: '/dashboard/support/synlighet' },
  },
  ads: {
    rubrik: 'Annonserna har precis startat',
    om:     'Ge dem några dagar. Siffror från de första dygnen svänger för mycket för att säga något.',
    guide:  { text: 'Så fungerar annonsering', href: '/dashboard/support/annonser' },
  },
  website: {
    rubrik: 'Mätningen är igång sedan nyligen',
    om:     'Den första veckan är för tunn att dra slutsatser av. Vi säger till när det finns nog.',
    guide:  { text: 'Så mäter du din hemsida', href: '/dashboard/support/webbplats' },
  },
}

export function TomtLage({ källa, läge }: { källa: Källa; läge: Dataläge }) {
  if (läge === 'egen' || läge === 'exempel') return null
  const t = (läge === 'ej-kopplat' ? EJ_KOPPLAT : FÖR_NYTT)[källa]

  return (
    <div className="border border-navy-700 rounded-2xl bg-navy-900/60 px-6 py-8 text-center">
      <p className="text-white font-semibold text-base">{t.rubrik}</p>
      <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">{t.om}</p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        {t.knapp && (
          <a
            href={t.knapp.href}
            className="px-5 py-2.5 bg-mustard text-navy-950 font-bold text-sm rounded-xl hover:bg-mustard/90 transition-colors"
          >
            {t.knapp.text}
          </a>
        )}
        <Link
          href={t.guide.href}
          className="px-5 py-2.5 border border-navy-600 text-slate-300 text-sm rounded-xl hover:border-navy-500 hover:text-white transition-colors"
        >
          {t.guide.text}
        </Link>
      </div>
    </div>
  )
}
