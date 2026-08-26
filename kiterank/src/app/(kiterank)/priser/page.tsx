import { Fragment } from 'react'
import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'
import { priskatalog, paketnyckel, bokningsnyckel, SMS_PRIS_KR } from '@/lib/betalning'

/*
 * Jämförelsen.
 *
 * Startsidans priskort listar bara det som skiljer varje nivå från den under —
 * "Allt i mallpaketet" bär resten. Det är rätt där, för tre listor som
 * upprepar varandra är tre listor ingen orkar läsa i förbifarten.
 *
 * Men den som redan är intresserad och står och väljer behöver motsatsen:
 * varje rad utskriven i varje kolumn, så att frågan "ingår det här om jag tar
 * det billigaste?" går att besvara genom att titta, inte genom att räkna ut
 * vad "allt i föregående paket" innehöll två kort tidigare.
 *
 * Raderna står i samma ordning i alla tre kolumnerna. Det är hela poängen —
 * ögat jämför vågrätt utan att man behöver läsa etiketterna en gång till.
 */

export const revalidate = 300

/* ─── Vad som ingår var ──────────────────────────────────────────────────
 *
 * En rad per sak vi levererar, och tre kryss. Listan är sanningen om vad
 * paketen innehåller — säljer vi något som inte står här är det inte sålt,
 * och står något här som inte finns är det ett löfte vi bryter.                */

type Rad = { text: string; mall: boolean; design: boolean; full: boolean }
type Grupp = { rubrik: string; rader: Rad[] }

const GRUPPER: Grupp[] = [
  {
    rubrik: 'Hemsidan',
    rader: [
      { text: 'Egen designad hemsida',                       mall: false, design: true,  full: true  },
      { text: 'Vi fyller er hemsida med innehåll och SEO-anpassar', mall: false, design: true, full: true },
      { text: 'Möjlighet att redigera allting själva och sätta er egen branding', mall: true, design: true, full: true },
      { text: 'Koppla er egen domän',                        mall: true,  design: true,  full: true  },
      { text: 'Drift, SSL-säkerhet och uppdateringar',       mall: true,  design: true,  full: true  },
    ],
  },
  {
    rubrik: 'Marknadsföringsplattformen',
    rader: [
      { text: 'Sköt om din Google Business Profile',         mall: true,  design: true,  full: true  },
      { text: 'Var och hur syns du på Google',               mall: true,  design: true,  full: true  },
      { text: 'Information om trafiken på din hemsida',      mall: true,  design: true,  full: true  },
      { text: 'Annonser: kostnad, klick och resultat',       mall: true,  design: true,  full: true  },
      { text: 'Omdömeshantering i plattformen',              mall: true,  design: true,  full: true  },
    ],
  },
  {
    rubrik: 'Hjälpen ni får',
    rader: [
      { text: 'Support på svenska',                          mall: true,  design: true,  full: true  },
      { text: 'Personlig genomgång av hela plattformen',     mall: false, design: false, full: true  },
      { text: 'Vi sköter Google-profilen: foton, inlägg och omdömen', mall: false, design: false, full: true },
      { text: 'Vi sköter annonserna: strategi, uppsättning och löpande justering', mall: false, design: false, full: true },
      { text: 'Löpande SEO-rådgivning på det ni skriver',    mall: false, design: false, full: true  },
      { text: 'Återaktivering av gamla kunder — ett utskick i månaden', mall: false, design: false, full: true },
      { text: 'Kvartalsrapport',                             mall: false, design: true,  full: true  },
      { text: 'Månadsrapport med plan och budget att godkänna', mall: false, design: false, full: true },
    ],
  },
  {
    rubrik: 'Villkoren',
    rader: [
      { text: '7 dagar gratis, utan kortuppgifter',          mall: true,  design: false, full: false },
      { text: 'Ingen bindningstid — avsluta när ni vill',    mall: true,  design: true,  full: true  },
      { text: 'Bokningssystemet kan läggas till',            mall: true,  design: true,  full: true  },
      { text: 'Ta med hemsidan efter 12 betalda månader',    mall: false, design: true,  full: true  },
      { text: 'Avdrag på pris efter 12 månader',             mall: false, design: true,  full: true  },
    ],
  },
]

type Nivå = 'mall' | 'design' | 'full'

const KOLUMNER: { id: Nivå; namn: string; pitch: string; paket: string; utmärkt?: boolean }[] = [
  {
    id: 'mall', paket: 'mall',
    namn: 'Hemsida + marknadsföringsplattform',
    pitch: 'Ni väljer design och gör den till er',
  },
  {
    id: 'design', paket: 'design',
    namn: 'Designad hemsida + marknadsföringsplattform',
    pitch: 'Vi formger sidan och startar upp er',
    utmärkt: true,
  },
  {
    id: 'full', paket: 'fullservice',
    namn: 'Full service',
    pitch: 'Vi sköter marknadsföringen — ni sköter salongen',
  },
]

/* ─── Priserna ─────────────────────────────────────────────────────────── */

type Pris = { manad: string | null; ar: string | null }

async function hämtaPriser() {
  const kr = (b: number | null | undefined) =>
    b == null ? null : `${b.toLocaleString('sv-SE')} kr`

  const tom: Pris = { manad: null, ar: null }
  try {
    const katalog = await priskatalog()
    const par = (plan: string): Pris => ({
      manad: kr(katalog.get(paketnyckel(plan as 'mall', 'manad'))?.belopp),
      ar:    kr(katalog.get(paketnyckel(plan as 'mall', 'ar'))?.belopp),
    })
    return {
      mall:   par('mall'),
      design: par('design'),
      full:   par('fullservice'),
      bokningMall:    kr(katalog.get(bokningsnyckel('mall', 'manad'))?.belopp),
      bokningPremium: kr(katalog.get(bokningsnyckel('design', 'manad'))?.belopp),
    }
  } catch {
    return { mall: tom, design: tom, full: tom, bokningMall: null, bokningPremium: null }
  }
}

/* ─── Sidan ────────────────────────────────────────────────────────────── */

export const metadata = {
  title:       'Priser | Kiterank',
  description: 'Exakt vad som ingår i Kiteranks tre paket — hemsida, marknadsföringsplattform och full service, rad för rad.',
}

export default async function PaketPage() {
  const priser = await hämtaPriser()

  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Nav />

      <section className="max-w-7xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Priser</h1>
          <p className="text-white/45 max-w-2xl mx-auto">
            Allt vi levererar, rad för rad. Hemsidan ingår i alla tre — det som skiljer dem är
            vem som formger den och hur mycket av marknadsföringen vi gör åt er.
          </p>
        </div>

        {/*
          * Funktionen till vänster, paketen som kolumner.
          *
          * Varje rad står skriven en gång, och de tre kryssen ligger på samma
          * höjd. Frågan kunden faktiskt ställer — "ingår det här om jag tar
          * det billigaste?" — besvaras då genom att följa en rad med ögat, i
          * stället för att leta upp samma formulering i tre olika listor.
          *
          * Kolumnhuvudet följer med vid rullning. Utan det sitter man tjugo
          * rader ned och vet inte längre vilken kolumn som är vilken.
          */}
        <div className="overflow-x-auto -mx-6 px-6">
          {/* Fasta kolumnbredder. Utan dem sätter webbläsaren bredden efter
              innehållet, och kolumnen med det längsta paketnamnet blir bredast
              — vilket får de tre att se olika viktiga ut i en jämförelse där
              hela poängen är att de ska vara jämförbara. */}
          {/* border-separate, inte collapse. Ett klistrat kolumnhuvud i en
              hopslagen tabell målar sin bakgrund över de första raderna — där
              försvann gruppetiketten "Hemsidan". Med separata kantlinjer
              beter sig huvudet som ett vanligt element, och raddragen flyttas
              då till cellerna eftersom en <tr> inte ritar kant i det läget. */}
          <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0">
            {/* Inget klistrat kolumnhuvud. Tabellen ligger i en vagn med
                overflow-x-auto för att kunna rullas i sidled på telefon, och
                sticky räknar då sitt läge mot vagnen i stället för mot sidan —
                huvudet sköts 64 px nedåt och lade sig över första raden. */}
            <thead>
              <tr>
                <th className="text-left align-bottom w-[34%]" />
                {KOLUMNER.map(k => {
                  const pris = priser[k.id]
                  return (
                    <th key={k.id} className="align-bottom px-3 text-center w-[22%]">
                      {/* Märket ligger innanför kortet och inte ovanpå kanten.
                          Tabellen sitter i en vagn som klipper allt utanför
                          sina kanter, och ett märke som sticker upp blir
                          avhugget på mitten. */}
                      <div className={`rounded-t-2xl px-4 pt-8 pb-4 relative ${
                        k.utmärkt ? 'bg-[#f0b429]/8' : ''
                      }`}>
                        {k.utmärkt && (
                          <span className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#f0b429] text-[#080f1e] text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                            Populärast
                          </span>
                        )}
                        <p className={`text-xs font-medium leading-snug ${k.utmärkt ? 'text-[#f0b429]' : 'text-white/50'}`}>
                          {k.namn}
                        </p>
                        {/* Priset på en rad. I en smal kolumn bryter "129 kr/mån"
                            mitt itu och läses som två tal. */}
                        <p className="text-2xl font-bold mt-2 whitespace-nowrap">
                          {pris.manad ?? 'Offert'}
                          {pris.manad && <span className="text-sm text-white/30 font-normal">/mån</span>}
                        </p>
                        {/* Årspriset som möjlighet, inte som huvudpris. De
                            flesta väljer månad, och ett "från"-pris få tar är
                            en siffra som sviker i kassan. */}
                        {pris.ar && (
                          <p className="text-white/30 text-[11px] mt-1.5 font-normal">
                            {pris.ar}/år — två månader fria
                          </p>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {GRUPPER.map(g => (
                <Fragment key={g.rubrik}>
                  <tr>
                    <td colSpan={4} className="pt-7 pb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                        {g.rubrik}
                      </p>
                    </td>
                  </tr>
                  {g.rader.map(r => (
                    <tr key={r.text}>
                      <td className="py-2.5 pr-4 text-sm text-white/70 leading-snug border-t border-white/5">{r.text}</td>
                      {KOLUMNER.map(k => (
                        <td
                          key={k.id}
                          className={`py-2.5 px-3 text-center border-t border-white/5 ${k.utmärkt ? 'bg-[#f0b429]/4' : ''}`}
                        >
                          {r[k.id]
                            ? <span className="text-[#f0b429] text-base">✓</span>
                            : <span className="text-white/15">–</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}

              {/* Beställningen sist i varje kolumn — där man landar när man
                  läst klart och bestämt sig. */}
              <tr>
                {/* Provet står inte här längre. Det gäller bara mallpaketet,
                    och en rad som lovar sju fria dagar till alla mitt emot en
                    tabell som säger motsatsen är ett löfte som bryts i kassan. */}
                <td className="pt-8 pr-4 align-top text-sm text-white/40">
                  Alla paket: ingen bindningstid, avsluta när ni vill
                </td>
                {KOLUMNER.map(k => (
                  <td key={k.id} className={`pt-8 px-3 pb-7 align-top ${k.utmärkt ? 'bg-[#f0b429]/4 rounded-b-2xl' : ''}`}>
                    <Link
                      href={`/onboarding?paket=${k.paket}`}
                      className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                        k.utmärkt
                          ? 'bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e]'
                          : 'bg-white/8 hover:bg-white/12 text-white border border-white/10'
                      }`}
                    >
                      Beställ →
                    </Link>
                    <p className="text-white/25 text-[11px] text-center mt-2.5 leading-snug">{k.pitch}</p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-white/30 text-xs text-center">* Alla priser är exklusive moms.</p>

        {/* ── Tilläggen ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#f0b429]/20 bg-[#f0b429]/4 p-8 space-y-5">
          <div>
            <h2 className="text-xl font-bold">Tillägg — kan kopplas på vilket paket som helst</h2>
            <p className="text-white/45 text-sm mt-1.5 max-w-2xl">
              De står utanför trappan med flit. Den som vill ha kalender men inte formgivning ska
              slippa köpa fel paket för att få den.
            </p>
          </div>

          {/* Tillägget får en egen innehållslista, precis som paketen.
              "Bokningssystem, 199 kr" säger ingenting om vad man får — och den
              som ska lägga på en femtedel av sin månadsavgift vill se raderna,
              inte rubriken. SMS står som en rad i listan och inte som ett eget
              kort: det är påminnelserna i bokningen som skickar dem, och att
              ställa dem bredvid varandra fick det att se ut som två köp. */}
          <div className="rounded-xl border border-white/10 bg-white/3 p-7">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h3 className="text-lg font-bold">Bokningssystem</h3>
              <span className="text-[#f0b429] font-semibold">
                {priser.bokningMall ? `${priser.bokningMall}/mån` : 'Offert'}
              </span>
              {priser.bokningPremium && (
                <span className="text-white/30 text-xs">
                  · {priser.bokningPremium}/mån på de två formgivna paketen
                </span>
              )}
            </div>

            <p className="text-white/45 text-sm leading-relaxed mt-2 max-w-2xl">
              Kalendern ligger på hemsidan och tar emot bokningar dygnet runt, även när salongen
              är stängd.
            </p>

            <div className="grid sm:grid-cols-2 gap-x-10 gap-y-2 mt-5">
              {[
                'Onlinebokning direkt på er hemsida',
                'Kalender med personal, scheman och tider per tjänst',
                'Bekräftelse och påminnelse till kunden',
                'Automatisk omdömesfråga efter besöket',
                'Kundregister med historik och anteckningar',
                'Regler för avbokning och hur sent man får boka',
                'Bokningsstatistik: fyllnadsgrad, uteblivna besök, återkommande kunder',
                'Kalendern kan speglas till din telefons egen kalender',
              ].map(rad => (
                <div key={rad} className="flex gap-2.5 text-sm text-white/60 leading-snug">
                  <span className="text-[#f0b429] shrink-0 text-xs mt-1">✓</span>
                  {rad}
                </div>
              ))}
            </div>

            {/* SMS: en rad i tillägget, med sitt pris. Den som läser listan
                ovanför undrar just då vad påminnelserna kostar. */}
            <div className="mt-6 pt-5 border-t border-white/8 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="font-semibold text-sm">SMS-utskick</span>
              <span className="text-[#f0b429] text-sm font-semibold">{SMS_PRIS_KR} kr per meddelande</span>
              <span className="text-white/40 text-sm leading-relaxed">
                Betalas i efterskott för de meddelanden som faktiskt skickats. Ingen startavgift,
                inget paket att köpa i förväg. E-post ingår utan kostnad.
              </span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-3 pt-4">
          <p className="text-white/45 text-sm">
            Osäker fortfarande? Börja med det minsta — ni kan byta uppåt när som helst.
          </p>
          <Link
            href="/onboarding"
            className="inline-block bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-8 py-3.5 rounded-xl transition-colors"
          >
            Prova gratis i 7 dagar →
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/30">
          <Link href="/" className="hover:text-white/60 transition-colors">← Till startsidan</Link>
          <div className="flex gap-6">
            <Link href="/villkor" className="hover:text-white/60 transition-colors">Villkor</Link>
            <Link href="/integritetspolicy" className="hover:text-white/60 transition-colors">Integritetspolicy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
