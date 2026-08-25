import Link from 'next/link'
import { StartaDemo } from './StartaDemo'

/*
 * Demokontot — hur plattformen ser ut när den är full.
 *
 * Ett tomt konto säljer ingenting. En kund på prov ser fyra flikar som säger
 * "koppla Google" och har ingen aning om vad de får när de gjort det. Det här
 * är svaret på den frågan.
 *
 * Egen adress med flit, inte ett läge som målar om deras eget konto. Två skäl:
 * en kund ska aldrig kunna bli osäker på om siffrorna de tittar på är deras
 * egna, och den som råkar lämna ett läge påslaget ska inte kunna fatta beslut
 * på en annan salongs data. Här är gränsen adressen i webbläsaren, och bandet
 * överst går inte att stänga.
 *
 * Siffrorna är en påhittad salong. Det står också, ordagrant — en demo som
 * försöker se ut som verklighet är en lögn med extra steg.
 */

const FLIKAR = [
  { href: '/dashboard/gbp',         namn: 'Google-profilen',  om: 'Omdömen, visningar, foton och konkurrenterna runt dig' },
  { href: '/dashboard/keywords',    namn: 'Synlighet',        om: 'Sökorden folk hittar dig med och var du ligger' },
  { href: '/dashboard/analytics',   namn: 'Hemsidan',         om: 'Besökare, varifrån de kommer och vad de gör' },
  { href: '/dashboard/paid-search', namn: 'Annonser',         om: 'Vad annonserna kostar och vad de ger tillbaka' },
]

export default function DemoPage() {
  return (
    <div className="px-4 sm:px-8 py-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Så fungerar plattformen</h1>
        <p className="text-slate-400 text-sm mt-1 leading-relaxed">
          Siffrorna nedan kommer från en påhittad salong, inte från dig. De visar vad du får se
          när din hemsida är klar och Google är kopplat — och ungefär hur mycket det brukar handla om
          för en salong som varit igång ett tag.
        </p>
      </div>

      <div className="bg-navy-800 border border-navy-700 rounded-2xl divide-y divide-navy-700">
        {FLIKAR.map(f => (
          <StartaDemo key={f.href} till={f.href}>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium">{f.namn}</p>
              <p className="text-slate-400 text-xs mt-0.5">{f.om}</p>
            </div>
            <span className="shrink-0 text-mustard text-sm">→</span>
          </StartaDemo>
        ))}
      </div>

      <div className="border-l-2 border-mustard/60 pl-4">
        <p className="text-slate-300 text-sm leading-relaxed">
          Det du inte ser här är det som gör siffrorna dina: din hemsida med dina bilder, och din
          Google-profil kopplad. Båda tar en kväll.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-3 text-xs font-semibold px-3 py-2 rounded-lg bg-mustard text-navy-950 hover:bg-mustard/90 transition-colors"
        >
          Tillbaka till mitt konto
        </Link>
      </div>
    </div>
  )
}
