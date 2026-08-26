import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'
import { MarknadsFot } from '@/components/marketing/MarknadsFot'

/*
 * Vanliga frågor.
 *
 * Svaren är hämtade ur villkoren och paketmodellen, inte hittade på för
 * sidans skull. Det är hela poängen med en frågesida: den som läser här ska
 * inte kunna bli överraskad av något som står i avtalet sedan.
 *
 * Frågorna är skrivna som en kund faktiskt ställer dem, inklusive de obekväma.
 * En frågesida som bara innehåller frågor som får oss att se bra ut är inte en
 * frågesida — den är en broschyr, och läsaren märker skillnaden direkt.
 */

export const metadata = {
  title:       'FAQ | Kiterank',
  description: 'Svar om priser, prov, uppsägning, hemsidan, bokningssystemet och vad som händer med er data.',
}

type Fraga = { f: string; s: string }
type Grupp = { rubrik: string; fragor: Fraga[] }

const GRUPPER: Grupp[] = [
  {
    rubrik: 'Att komma igång',
    fragor: [
      {
        f: 'Hur lång tid tar det innan sidan är uppe?',
        s: 'På mallpaketet är den publicerad direkt när registreringen är klar — några minuter. På de två formgivna paketen ritar vi ett förslag och hör av oss inom två arbetsdagar, och sedan bygger vi den åt er.',
      },
      {
        f: 'Måste jag kunna något om hemsidor?',
        s: 'Nej. Ni väljer en design, skriver in företagsnamn och bransch, och sidan kommer ifylld med texter och tjänster för er sorts verksamhet. Allt går att ändra efteråt, och ni kan inte ha sönder något — varje publicering sparas, så det går alltid att gå tillbaka.',
      },
      {
        f: 'Kan jag prova innan jag betalar?',
        s: 'Ja, mallpaketet kan provas i sju dagar utan kostnad och utan kortuppgifter. Provet övergår inte automatiskt i ett abonnemang — ni väljer själva att teckna ett. De två formgivna paketen innehåller arbete vi utför åt er och provas därför inte, men ni betalar ingenting förrän ni sagt ja till förslaget.',
      },
      {
        f: 'Kan jag behålla min nuvarande domän?',
        s: 'Ja. Sidan publiceras direkt på en adress hos oss, och er egen domän kopplas när ni vill. Domänen är alltid er — vi tar aldrig över ägandet av den, varken vid start eller om ni slutar.',
      },
    ],
  },
  {
    rubrik: 'Priser och betalning',
    fragor: [
      {
        f: 'Är priserna med eller utan moms?',
        s: 'Utan. Alla priser på sajten anges exklusive moms, som tillkommer i kassan enligt gällande skattesats. Är ni momsregistrerade i ett annat EU-land och anger ert momsnummer hanteras det enligt reglerna för omvänd betalningsskyldighet.',
      },
      {
        f: 'Vad kostar årsbetalning?',
        s: 'Tio månadsavgifter i stället för tolv — två månader utan kostnad. Beloppet dras en gång per år.',
      },
      {
        f: 'Vad kostar SMS?',
        s: '1 krona per skickat meddelande, i efterskott på nästa ordinarie faktura. Ingen startavgift, inget paket att köpa i förväg, och ni betalar bara för de meddelanden som faktiskt gått iväg.',
      },
      {
        f: 'Blir det billigare med tiden?',
        s: 'På de två formgivna paketen, ja. Efter tolv betalda månader är formgivningen avbetald, och då sänks månadsavgiften. Mallpaketet har inget sådant avdrag eftersom designen där inte är ritad för er.',
      },
    ],
  },
  {
    rubrik: 'Avtal och uppsägning',
    fragor: [
      {
        f: 'Hur lång är bindningstiden?',
        s: 'Ingen. Ni säger upp abonnemanget i plattformen när ni vill, och det upphör vid periodens slut. Ni behåller tjänsten perioden ut, och redan betald avgift återbetalas inte.',
      },
      {
        f: 'Får jag behålla hemsidan om jag slutar?',
        s: 'Har ni ett formgivet paket och betalat minst tolv hela månader, ja — då lämnar vi ut sidans utseende och innehåll som färdiga filer att lägga upp var ni vill. Begäran ska göras inom trettio dagar från att abonnemanget upphörde. Mallpaketets designer är våra och följer inte med.',
      },
      {
        f: 'Får jag med mig mitt kundregister?',
        s: 'Alltid, oavsett paket och oavsett hur länge ni varit kund. Kundregister, bokningshistorik och innehåll lämnas ut i maskinläsbart format under trettio dagar efter att abonnemanget upphört. Det är er data, inte vår.',
      },
      {
        f: 'Kan jag byta paket?',
        s: 'Uppåt när som helst — det görs på begäran eftersom det kräver formgivning och arbetstid som ska planeras in. Nedåt sker vid periodens slut, och ni behåller det högre paketet perioden ut. Tänk på att en formgiven sida inte följer med ned till mallpaketet.',
      },
    ],
  },
  {
    rubrik: 'Bokning, Google och data',
    fragor: [
      {
        f: 'Ingår bokningssystemet?',
        s: 'Nej, det är ett tillägg som kan kopplas på vilket paket som helst mot en särskild avgift. Det står utanför paketen med flit — den som vill ha kalender men inte formgivning ska slippa köpa fel sak för att få den.',
      },
      {
        f: 'Vilka Google-konton behöver ni tillgång till?',
        s: 'Företagsprofilen, Search Console, och om ni har dem även Google Ads och besöksstatistiken. Vi läser era siffror och kan publicera det ni godkänt — vi spenderar aldrig pengar och ändrar aldrig inställningar utan att ni sagt ja.',
      },
      {
        f: 'Vad händer med uppgifterna om era kunder?',
        s: 'De är era, och vi behandlar dem för er räkning enligt det personuppgiftsbiträdesavtal som ingår i abonnemanget. Vi säljer dem aldrig vidare och använder dem inte för egna ändamål.',
      },
      {
        f: 'Vad gäller om jag har flera salonger?',
        s: 'Varje abonnemang gäller en verksamhet med en Google-profil. Driver ni flera, hör av er så tittar vi på ett upplägg — det är vanligare än man tror och löser sig oftast enkelt.',
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Nav />

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-10 text-center space-y-4">
        <h1 className="text-4xl font-bold leading-tight">FAQ</h1>
        <p className="text-white/45 leading-relaxed">
          Svaren stämmer med det som står i villkoren. Hittar du inte din fråga är det bara att
          skriva — vi svarar på riktigt, och lägger till den här om fler undrar samma sak.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16 space-y-12">
        {GRUPPER.map(g => (
          <div key={g.rubrik}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-4">
              {g.rubrik}
            </h2>
            {/* <details> och inte en klickhanterare i JavaScript: frågorna går
                att öppna innan sidan hunnit köra någon kod, de går att söka i
                med webbläsarens sökfunktion, och de fungerar för den som läser
                med skärmläsare. */}
            <div className="space-y-2">
              {g.fragor.map(q => (
                <details
                  key={q.f}
                  className="group rounded-xl border border-white/10 bg-white/3 px-5 py-4 open:bg-white/6 transition-colors"
                >
                  <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-medium">
                    {q.f}
                    <span className="text-[#f0b429] shrink-0 mt-0.5 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="text-white/50 text-sm leading-relaxed mt-3">{q.s}</p>
                </details>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-white/10 bg-white/3 p-7 text-center space-y-3">
          <p className="font-bold">Fick du inte svar?</p>
          <p className="text-white/45 text-sm">Skriv till oss, så återkommer vi normalt samma arbetsdag.</p>
          <Link
            href="/kontakt"
            className="inline-block bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Kontakta oss →
          </Link>
        </div>
      </section>

      <MarknadsFot />
    </div>
  )
}
