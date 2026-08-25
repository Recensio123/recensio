'use client'

/*
 * Grinden före guiden.
 *
 * Den som klickat på ett pris har redan valt, och ser aldrig den här sidan —
 * de går rakt in på steg 1. Den som kommer via "Skapa ett konto" har inte
 * valt någonting, och paketet avgör hela registreringen efter det: mallkunden
 * väljer sin design själv, premiumkunden får designfrågor i stället.
 *
 * Utan valet här måste vi gissa, och gissningen blir alltid mallen. Då hamnar
 * den som var beredd att betala för en formgiven sida i mallgalleriet och tror
 * att det är allt vi säljer.
 *
 * Skärmen är därför ingen prislista utan en vägvisare — tre kort, en mening om
 * vad som skiljer dem, och priset som stöd. Jämförelsen i detalj finns på
 * startsidan, och den som vill läsa mer ska inte behöva göra det mitt i en
 * registrering.
 */

export type Nivå = 'mall' | 'design' | 'fullservice'

export type Paketpriser = {
  mall:        string | null
  design:      string | null
  fullservice: string | null
}

const KORT: { id: Nivå; namn: string; pitch: string; punkter: string[]; utmärkt?: boolean }[] = [
  {
    id:    'mall',
    namn:  'Hemsida + marknadsföringsplattform',
    pitch: 'Du väljer en färdig design och gör den till din',
    punkter: [
      'Sidan står uppe i dag, ifylld för din bransch',
      'Texter, bilder, färger och sektioner ändrar du själv',
      'Hela marknadsföringsplattformen ingår',
    ],
  },
  {
    id:    'design',
    namn:  'Designad hemsida + marknadsföringsplattform',
    pitch: 'Vi formger sidan från grunden och startar upp er',
    punkter: [
      'Allt i mallpaketet',
      'En sida ritad för just er — ingen mall',
      'Vi bygger, fyller och publicerar åt er',
      'Personlig genomgång av plattformen',
    ],
    utmärkt: true,
  },
  {
    id:    'fullservice',
    namn:  'Full service',
    pitch: 'Vi sköter marknadsföringen — ni sköter salongen',
    punkter: [
      'Allt i designpaketet',
      'Annonser och omdömen sköts löpande',
      'Ändringar på sidan när ni vill',
      'Månatlig genomgång av resultatet',
    ],
  },
]

export function Paketval({
  priser,
  onVälj,
}: {
  priser: Paketpriser
  onVälj: (nivå: Nivå) => void
}) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Vad ska vi bygga åt er?</h2>
        <p className="text-slate-400">
          Valet styr resten av registreringen. Det går att byta senare — och du betalar
          ingenting förrän provet är slut.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {KORT.map(k => (
          <button
            key={k.id}
            onClick={() => onVälj(k.id)}
            className={`text-left rounded-2xl p-6 flex flex-col gap-4 border-2 transition-all relative
              ${k.utmärkt
                ? 'border-mustard/40 bg-mustard/5 hover:border-mustard'
                : 'border-navy-700 bg-navy-900 hover:border-navy-500'}`}
          >
            {k.utmärkt && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mustard text-navy-950 text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                Populärast
              </span>
            )}

            <div>
              <p className="text-white font-semibold leading-snug">{k.namn}</p>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{k.pitch}</p>
            </div>

            <div className="flex items-baseline gap-1.5">
              {/* Svarar Stripe inte visas "Offert" i stället för ett belopp ur
                  koden. Ett uteblivet pris kostar ett samtal; ett felaktigt
                  pris kostar förtroendet. */}
              <span className="text-2xl font-bold text-white">{priser[k.id] ?? 'Offert'}</span>
              {priser[k.id] && <span className="text-slate-500 text-sm">/mån</span>}
            </div>

            <ul className="space-y-1.5 flex-1">
              {k.punkter.map(p => (
                <li key={p} className="flex gap-2 text-xs text-slate-400 leading-relaxed">
                  <span className="text-mustard shrink-0">✓</span>{p}
                </li>
              ))}
            </ul>

            <span
              className={`mt-1 block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors
                ${k.utmärkt
                  ? 'bg-mustard text-navy-950'
                  : 'bg-navy-800 text-white border border-navy-600'}`}
            >
              {k.id === 'mall' ? 'Prova gratis i 7 dagar →' : 'Kom igång — vi ritar åt er →'}
            </span>
          </button>
        ))}
      </div>

      {/* Bokningen står utanför trappan med flit. Den är ett tillägg på alla tre
          nivåerna, och att antyda att den hör till en av dem hade fått den som
          vill ha kalender att köpa fel paket. */}
      <p className="text-center text-slate-500 text-xs mt-8">
        Bokningssystemet är ett tillägg som kan kopplas på vilket paket som helst — du väljer
        det inne i plattformen när du sett hur det fungerar.
      </p>
    </div>
  )
}
