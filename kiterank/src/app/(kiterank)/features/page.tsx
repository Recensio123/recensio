import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'

/*
 * Funktionsöversikten.
 *
 * Sidan var tidigare åtta jämnstora avsnitt i rad, ett per datakälla, på
 * engelska. Den som kom in via menyn hamnade i rätt avsnitt; den som klickade
 * på "Funktioner" i toppen fick börja läsa från början och själv lista ut var
 * det de sökte fanns.
 *
 * Nu börjar sidan med tre områden — hemsidan, synligheten, trafiken — och
 * frågan om var man vill gå in. Detaljerna ligger kvar under, i samma ordning
 * som korten, med samma ankare som menyn pekar på.
 *
 * Avsnitten är också färre än förut. Google-profilen, foton, inlägg och frågor
 * var fyra rubriker för något kunden upplever som en enda sak: syns jag på
 * Google, och ser det bra ut när någon hittar mig?
 */

export const metadata = {
  title:       'Funktioner | Kiterank',
  description: 'Hemsida, bokning, Google-profil, synlighet, omdömen, trafik och annonser — allt i en plattform byggd för salonger och lokala tjänsteföretag.',
}

/* ─── Avsnitten ──────────────────────────────────────────────────────────
 *
 * En källa, två vyer. Rutorna högst upp och avsnitten längre ned ritas ur
 * samma lista — annars glider de isär den dag en del byter namn, och kunden
 * klickar på en ruta som lovar något annat än rubriken den landar på.
 *
 * Varje del bär sin egen färg. Åtta rutor i samma nyans läses som en tapet;
 * med varsin ton får ögat något att skilja dem åt på, och färgen följer med
 * ned till avsnittet så att man ser att man kommit rätt.                     */

type Avsnitt = {
  id: string; ikon: string; etikett: string; farg: string
  kort: string
  rubrik: string; text: string; punkter: string[]
}

const AVSNITT: Avsnitt[] = [
  {
    id: 'hemsida', ikon: '▤', etikett: 'Hemsidan', farg: '#f0b429',
    kort: 'Färdig och publicerad samma dag, ifylld för er bransch.',
    rubrik: 'En hemsida som står uppe i dag, inte om sex veckor.',
    text: 'Ni väljer en design, skriver in namnet och er bransch — och sidan är publicerad. Den kommer ifylld med texter, tjänster och vanliga frågor skrivna för just er sorts verksamhet, så att ni har något riktigt att ändra i i stället för en tom mall att fylla från noll.',
    punkter: [
      'Publicerad direkt på en adress hos oss, egen domän kopplas när ni vill',
      'Texter, bilder, färger och sektioner ändrar ni själva',
      'En egen sida per tjänst, byggd så att Google förstår vad ni erbjuder',
      'Prislista, galleri, omdömen och kontaktuppgifter ingår som färdiga block',
      'Drift, SSL-säkerhet och uppdateringar sköter vi',
    ],
  },
  {
    id: 'bokning', ikon: '◷', etikett: 'Bokningssystem', farg: '#2dd4bf',
    kort: 'Kalender som tar emot bokningar dygnet runt.',
    rubrik: 'Bokningar dygnet runt, utan ett enda telefonsamtal.',
    text: 'Kalendern ligger på hemsidan och tar emot bokningar när salongen är stängd. Personal, tjänster och arbetstider styr vad som går att boka, och kunden får bekräftelse och påminnelse automatiskt.',
    punkter: [
      'Kalender med personal, scheman och tider per tjänst',
      'Bekräftelse och påminnelse via e-post eller SMS',
      'Omdömesfråga skickas automatiskt efter besöket',
      'Kundhistorik med anteckningar inför nästa gång',
      'Bokningsstatistik: fyllnadsgrad, uteblivna besök och återkommande kunder',
    ],
  },
  {
    id: 'google', ikon: '✦', etikett: 'Google-profilen', farg: '#38bdf8',
    kort: 'Foton, inlägg, frågor och kategorier på ett ställe.',
    rubrik: 'Företagsprofilen, skött utan att ni behöver logga in hos Google.',
    text: 'Företagsprofilen är den viktigaste marknadsföringstillgången ett lokalt företag har — det är den som visas när någon söker på er eller på er tjänst i området. Vi håller ett öga på varje del av den som påverkar hur ni syns, och säger till när något halkar efter.',
    punkter: [
      'Foton: hur många ni har, hur färska de är, och hur det står sig mot området',
      'Inlägg: publicera direkt härifrån och se om ni postar tillräckligt ofta',
      'Frågor och svar bevakas så att ingen kundfråga blir stående obesvarad',
      'Kategorier, tjänster och egenskaper kontrolleras mot vad som är rätt för er',
      'Fullständighetsgrad jämförd med den som ligger överst i ert område',
    ],
  },
  {
    id: 'synlighet', ikon: '◎', etikett: 'Sök och kartor', farg: '#a78bfa',
    kort: 'Var ni rankar, på vilka ord, mot vilka grannar.',
    rubrik: 'Var ni faktiskt rankar — ord för ord, plats för plats.',
    text: 'Att "synas på Google" är inte ett läge utan en position, och den skiljer sig mellan sökord och mellan gathörn. Här ser ni vilka ord som ger er besök, var ni ligger på kartan i olika delar av området, och vilka ord grannarna tar som ni missar.',
    punkter: [
      'Positioner per sökord, med förändring över tid',
      'Kartrankning i ett rutnät över ert område — inte ett snitt, utan var',
      'Sökord som ger visningar men inga klick, alltså rubriker som inte lockar',
      'Ordklyftor mot närmaste konkurrenter',
      'Säsongsmönster: vad folk i er bransch söker på just nu',
    ],
  },
  {
    id: 'omdomen', ikon: '★', etikett: 'Omdömen', farg: '#fb7185',
    kort: 'Nya omdömen, färdiga svar och betygstrend.',
    rubrik: 'Inget omdöme blir obesvarat.',
    text: 'Omdömen är den starkaste förtroendesignalen ett lokalt företag har, och ett företag som svarar på alla — även de sura — vinner både placeringar och kunder över ett som inte gör det. Nya omdömen dyker upp här i samma stund de publiceras, med ett svarsförslag att justera och skicka.',
    punkter: [
      'Nya omdömen syns direkt, med färdiga svarsförslag att redigera',
      'Betygstrend: går omdömena uppåt eller nedåt över tid',
      'Ert snittbetyg mot de närmaste konkurrenterna',
      'Svarsfrekvens, så att ni ser om ni börjat halka efter',
      'Takt: hur många omdömen ni får per månad jämfört med grannarna',
    ],
  },
  {
    id: 'trafik', ikon: '↗', etikett: 'Besökarna', farg: '#4ade80',
    kort: 'Varifrån trafiken kommer och vad den gör på sidan.',
    rubrik: 'Varifrån besökarna kommer, och vad de gör när de kommit.',
    text: 'Trafiksiffror i sig är inte intressanta — det som är intressant är vilken kanal som ger bokningar och vilken som bara ger besök. Här står Googles egna siffror, oförändrade, tillsammans med vad som hände på sidan efteråt.',
    punkter: [
      'Besök per kanal: sök, karta, annonser, sociala medier och direkt',
      'Vilka sidor som besöks mest, och vilka som ingen hittar',
      'Vilka tider på dygnet och veckan trafiken kommer',
      'Klick till telefonnummer, vägbeskrivning och bokning',
      'Utveckling vecka för vecka i stället för ett värde utan sammanhang',
    ],
  },
  {
    id: 'annonser', ikon: '◈', etikett: 'Annonser', farg: '#fb923c',
    kort: 'Vad varje krona kostade och vad den gav tillbaka.',
    rubrik: 'Vad annonserna kostade, och vad de gav.',
    text: 'Google Ads egna vyer är byggda för byråer. Här står samma siffror i klarspråk: vad ni betalade, vad ni fick, och vilka sökord som drar pengar utan att leverera något tillbaka.',
    punkter: [
      'Kostnad, klick och kostnad per klick — utan branschjargong',
      'Vilka sökord som ger bokningar och vilka som bara kostar',
      'Annonstexter med betyg, så att svaga rader kan bytas ut',
      'Budgeten som gick till sökningar som inte var relevanta',
      'Resultatet ställt mot vad ni får in utan att betala för det',
    ],
  },
  {
    id: 'veckoplan', ikon: '✓', etikett: 'Veckans plan', farg: '#818cf8',
    kort: 'Tre saker att göra i veckan, valda ur era egna siffror.',
    rubrik: 'Ni behöver inte tolka siffrorna. Ni behöver veta vad ni ska göra.',
    text: 'All statistik i världen hjälper inte den som inte vet vilken av tjugo möjliga åtgärder som är den viktigaste den här veckan. Plattformen läser era egna siffror och plockar ut tre saker: det som ger mest, det som är mest akut, och det som tar minst tid att bli av med.',
    punkter: [
      'Tre uppgifter i veckan, i prioritetsordning och i klarspråk',
      'Varje uppgift säger varför den ligger där och vad den väntas ge',
      'Bygger på era faktiska siffror, inte på en allmän checklista',
      'Avklarade uppgifter bockas av och nya kommer nästa vecka',
      'Går att göra själv på tio minuter — eller lämna till oss i full service',
    ],
  },
]

/* ─── Sidan ────────────────────────────────────────────────────────────── */

function AvsnittBlock({ a, vand }: { a: Avsnitt; vand: boolean }) {
  return (
    <section
      id={a.id}
      className={`max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-14 items-center scroll-mt-20 ${
        vand ? 'md:[&>*:first-child]:order-2' : ''
      }`}
    >
      <div className="space-y-5">
        {/* Etiketten bär avsnittets färg, samma som rutan man klickade på —
            kvittot på att man landat där man siktade. */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 border"
          style={{ background: `${a.farg}14`, borderColor: `${a.farg}40` }}
        >
          <span className="text-base" style={{ color: a.farg }}>{a.ikon}</span>
          <span className="text-xs font-medium" style={{ color: a.farg }}>{a.etikett}</span>
        </div>
        <h2 className="text-2xl font-bold text-white leading-snug">{a.rubrik}</h2>
        <p className="text-white/50 leading-relaxed">{a.text}</p>
        <ul className="space-y-2.5">
          {a.punkter.map(p => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-white/60">
              <span className="mt-0.5 shrink-0 text-xs" style={{ color: a.farg }}>✓</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      {/* Platshållare tills det finns riktiga skärmbilder att visa. Den bär
          avsnittets färg som ett svagt sken, så att sidan inte blir åtta
          identiska gråa fyrkanter i rad. */}
      <div
        className="rounded-2xl aspect-[4/3] flex items-center justify-center border"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${a.farg}1a, transparent 70%)`,
          borderColor: `${a.farg}26`,
        }}
      >
        <span className="text-5xl" style={{ color: a.farg, opacity: 0.35 }}>{a.ikon}</span>
      </div>
    </section>
  )
}

export default function FeaturesPage() {
  return (
    <div className="relative bg-[#080f1e] text-white min-h-screen overflow-hidden">
      <Nav />

      {/* Ett sken bakom ingången. Sidan är åtta rutor och sju avsnitt på
          samma mörka botten; utan något som bryter av läser den som en lista
          i ett kalkylark. Ligger bakom innehållet och tar inga klick. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70"
        style={{
          background:
            'radial-gradient(60% 60% at 20% 0%, rgba(240,180,41,0.14), transparent 70%),' +
            'radial-gradient(50% 50% at 80% 10%, rgba(56,189,248,0.10), transparent 70%),' +
            'radial-gradient(40% 40% at 50% 30%, rgba(167,139,250,0.08), transparent 70%)',
        }}
      />

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-12 text-center space-y-5">
        <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-4 py-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-medium">Plattformen ingår i alla paket</span>
        </div>
        <h1 className="text-4xl font-bold leading-tight">
          Hemsidan, bokningen och<br className="hidden md:block" />
          <span className="text-[#f0b429]"> allt som får den att hittas.</span>
        </h1>
        <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
          Sju delar, ett konto. Ni behöver aldrig logga in någon annanstans för att se hur det går.
        </p>
      </section>

      {/* ── Översikten: välj var du vill gå in ──────────────────────────
          Åtta rutor, fyra över fyra. Varje ruta är en hel del av produkten
          med sin egen färg, och "Läs mer" tar ned till avsnittet om den. */}
      <section className="relative max-w-6xl mx-auto px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AVSNITT.map(a => (
            <Link
              key={a.id}
              href={`#${a.id}`}
              className="group rounded-2xl border border-white/10 bg-white/3 p-5 flex flex-col gap-3 transition-colors hover:bg-white/6"
              style={{ borderTopColor: a.farg, borderTopWidth: 2 }}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ background: `${a.farg}1f`, color: a.farg }}
              >
                {a.ikon}
              </span>
              <div className="flex-1 space-y-1.5">
                <h2 className="font-bold leading-snug">{a.etikett}</h2>
                <p className="text-white/40 text-xs leading-relaxed">{a.kort}</p>
              </div>
              <span
                className="text-xs font-medium flex items-center gap-1.5 transition-colors text-white/35 group-hover:text-white"
                style={{ color: undefined }}
              >
                Läs mer
                <span style={{ color: a.farg }}>↓</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="border-t border-white/5" />

      {/* ── Avsnitten ─────────────────────────────────────────────────── */}
      {AVSNITT.map((a, i) => (
        <div key={a.id}>
          <AvsnittBlock a={a} vand={i % 2 === 1} />
          {i < AVSNITT.length - 1 && <div className="border-t border-white/5" />}
        </div>
      ))}

      {/* ── Avslutning ────────────────────────────────────────────────── */}
      <section className="border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center space-y-5">
          <h2 className="text-3xl font-bold leading-snug">
            Allt det här ingår i plattformen.<br />Det som skiljer paketen är hemsidan.
          </h2>
          <p className="text-white/45">
            Mallpaketet ger er samma plattform som full service. Skillnaden är vem som formger
            sidan och hur mycket av marknadsföringen vi gör åt er.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/priser"
              className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-7 py-3.5 rounded-xl transition-colors"
            >
              Jämför paketen →
            </Link>
            <Link
              href="/onboarding"
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Eller kom igång direkt
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-white/30">
          <Link href="/" className="hover:text-white/60 transition-colors">← Till startsidan</Link>
          <div className="flex gap-6">
            <Link href="/priser" className="hover:text-white/60 transition-colors">Paket</Link>
            <Link href="/villkor" className="hover:text-white/60 transition-colors">Villkor</Link>
            <Link href="/integritetspolicy" className="hover:text-white/60 transition-colors">Integritetspolicy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
