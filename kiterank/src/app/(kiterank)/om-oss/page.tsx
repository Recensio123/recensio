import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'
import { MarknadsFot } from '@/components/marketing/MarknadsFot'

/*
 * Om oss.
 *
 * Sidan är byggd kring det som går att belägga: vad vi bygger, för vem, och
 * hur vi tar betalt. Personhistorien står i ett eget block längre ned med en
 * platshållartext, eftersom den ska skrivas av den som levt den.
 *
 * Ingen text om "passion för skönhetsbranschen" och inga påhittade siffror om
 * hur många kunder vi har. En om-oss-sida som skryter om saker läsaren inte
 * kan kontrollera gör tvärtom mot vad den ska.
 */

export const metadata = {
  title:       'Om Kiterank | Kiterank',
  description: 'Varför Kiterank finns, vem vi bygger för och hur vi arbetar — hemsida, bokning och marknadsföring för salonger och lokala tjänsteföretag.',
}

const HALLNINGAR = [
  {
    rubrik: 'Ni äger det ni betalat för',
    text: 'Domänen är er, kundregistret är ert, och en formgiven sida får ni ta med er när ni betalat av den. Att hålla en kund kvar genom att sitta på deras saker är inte en affärsmodell, det är en gisslansituation.',
  },
  {
    rubrik: 'Inga siffror vi målat om',
    text: 'Googles data visas som Google levererar den, i Googles egna ramar. Vi räknar inte om och vi jämnar inte ut. En snygg kurva som inte stämmer är värre än en ful som gör det.',
  },
  {
    rubrik: 'Inget vi inte gör',
    text: 'Vi lovar inte förstaplats på Google, för ingen kan lova det. Vi säger vad som påverkar placeringen, gör det som går att göra, och visar vad det gav.',
  },
  {
    rubrik: 'Ingen bindningstid',
    text: 'Ni säger upp när ni vill och tjänsten fortsätter perioden ut. Ett abonnemang ska behållas för att det är värt pengarna, inte för att det är krångligt att ta sig ur.',
  },
]

/*
 * Grundarens egna ord.
 *
 * Platshållare. Ersätts av Jakob — den här delen ska låta som en människa och
 * inte som en produktbeskrivning, och då måste den skrivas av den som var med.
 */
const BERATTELSE = `[Din text här. Berätta kort varför du började med det här: vad du såg hos salongerna du pratade med, vad de betalade för och vad de faktiskt fick. Två eller tre stycken räcker — det är det personliga som gör att någon vågar höra av sig.]`

export default function OmOssPage() {
  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Nav />

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-14 space-y-5">
        <h1 className="text-4xl font-bold leading-tight">
          Vi bygger det en salong faktiskt behöver.<br />
          <span className="text-[#f0b429]">Inte det en byrå vill sälja.</span>
        </h1>
        <p className="text-white/50 text-lg leading-relaxed">
          En salong med fyra stolar har inte en marknadsavdelning. Den har en ägare som klipper hela
          dagen och sedan ska försöka begripa varför bokningarna gick ned i mars. Kiterank är byggt
          för den personen.
        </p>
      </section>

      <div className="border-t border-white/5" />

      {/* ── Problemet ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-14 space-y-5">
        <h2 className="text-2xl font-bold leading-snug">Problemet vi startade i</h2>
        <p className="text-white/50 leading-relaxed">
          Lokala tjänsteföretag har i praktiken tre val. De kan bygga sin hemsida själva i ett
          verktyg som inte vet något om deras bransch, och sedan aldrig hinna göra något åt att
          ingen hittar den. De kan anlita en byrå som tar femsiffrigt för sidan och sedan
          fakturerar per timme för varje ändring. Eller så kan de låta bli, och hoppas på att
          folk går förbi.
        </p>
        <p className="text-white/50 leading-relaxed">
          Ingen av vägarna ger det som faktiskt behövs: en sida som står uppe, en kalender som tar
          emot bokningar när salongen är stängd, och någon som säger vad som är värt att göra den
          här veckan för att fler ska hitta dit. Det är de tre sakerna vi byggde, i ett konto och
          till ett pris i månaden.
        </p>
      </section>

      <div className="border-t border-white/5" />

      {/* ── Hållningar ────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <h2 className="text-2xl font-bold leading-snug mb-8">Så arbetar vi</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {HALLNINGAR.map(h => (
            <div key={h.rubrik} className="rounded-2xl border border-white/10 bg-white/3 p-6">
              <p className="font-bold">{h.rubrik}</p>
              <p className="text-white/45 text-sm leading-relaxed mt-2">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-white/5" />

      {/* ── Berättelsen ───────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-14 space-y-5">
        <h2 className="text-2xl font-bold leading-snug">Bakom Kiterank</h2>
        <p className="text-white/50 leading-relaxed whitespace-pre-line">{BERATTELSE}</p>
      </section>

      <div className="border-t border-white/5" />

      {/* ── Avslutning ────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center space-y-5">
        <h2 className="text-2xl font-bold leading-snug">Vill ni veta om det passar er?</h2>
        <p className="text-white/45">
          Hör av er med vad ni driver och var, så säger vi rakt ut om vi är rätt för er eller inte.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
          <Link
            href="/kontakt"
            className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-7 py-3.5 rounded-xl transition-colors"
          >
            Hör av er →
          </Link>
          <Link href="/priser" className="text-white/60 hover:text-white text-sm transition-colors">
            Eller se vad det kostar
          </Link>
        </div>
      </section>

      <MarknadsFot />
    </div>
  )
}
