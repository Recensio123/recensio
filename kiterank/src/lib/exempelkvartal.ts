import { MOCK_BOOKINGS, type Booking } from '@/app/(kiterank)/dashboard/bokningar/data'

/*
 * Kvartalsrapporten för exempelsalongen.
 *
 * Skiljer sig från månadsrapporten i vad den är till för. Månadsrapporten
 * svarar på "vad hände och vad gjorde ni" — kvartalsrapporten svarar på "åt
 * vilket håll går det", och det kräver jämförelser som ingen ser i panelen:
 *
 *   Kvartalet mot föregående kvartal. Två månader i rad säger ingenting om en
 *   trend; tre månader mot tre månader gör det.
 *
 *   Kvartalet mot samma kvartal i fjol. Utan den jämförelsen tolkas varje
 *   säsongsvariation som en förbättring eller en försämring — en salong som
 *   går sämre i juli går inte sämre, den har semester.
 *
 *   Kundstocken. Hur många som var nya, hur många som kom tillbaka, och hur
 *   många som slutade komma. Det sista är den siffra ingen tittar på och den
 *   som förklarar mest, eftersom en salong kan skaffa nya kunder i jämn takt
 *   och ändå krympa.
 *
 *   De svagaste tiderna. Vilken veckodag och vilken timme som står tom är
 *   underlag för nästa kvartals arbete, inte en siffra att beundra.
 *
 * Allt ovan räknas ur exempelsalongens egen kalender — samma bokningar som
 * panelen visar. Sökordsrörelser, betyg och konkurrentläge går inte att räkna
 * fram ur en kalender och står därför i en egen del av datan, tydligt märkt.
 */

/* ─── Vad rapporten innehåller ─────────────────────────────────────────── */

export type Jamforelse = {
  nu: number
  fore: number
  ifjol: number | null
}

export type Kvartalsdata = {
  salong:   { namn: string; ort: string }
  period:   { nu: string; fore: string; ifjol: string }
  bokningar: Jamforelse
  varde:     Jamforelse
  snitt:     Jamforelse
  kunder: {
    nya:        number
    aterkommande: number
    /** Kunder som bokade förra kvartalet men inte det här. */
    tappade:    number
    /** Andel av kvartalets bokningar som kom från någon som varit där förut. */
    andelAter:  number
  }
  kanaler:  { namn: string; antal: number; forandring: number | null }[]
  tjanster: { namn: string; antal: number; varde: number; forandring: number | null }[]
  svagast:  { dag: string; antal: number }[]
  /* Det som inte går att räkna fram ur en kalender. */
  synlighet: {
    betyg:      Jamforelse
    omdomen:    Jamforelse
    sokord:     { fras: string; nu: number; fore: number }[]
    konkurrenter: { namn: string; betyg: number; omdomen: number; kartplats: number }[]
  }
  nastaKvartal: { rubrik: string; text: string }[]
}

/* ─── Räknandet ────────────────────────────────────────────────────────── */

const DAGAR = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']

/*
 * Ett datum som text, räknat lokalt.
 *
 * toISOString räknar om till UTC först, och i svensk sommartid flyttas då
 * midnatt den 1 april till den 31 mars. Kvartalet börjar en dag för tidigt och
 * bokningarna hamnar i fel kvartal — ett fel som bara syns två gånger om året
 * och som ingen letar efter.
 */
function dagtext(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

/** Kvartalet en dag hör till, som {start, slut} i YYYY-MM-DD. */
function kvartalet(nu: Date, stegTillbaka: number) {
  const k = Math.floor(nu.getMonth() / 3) - stegTillbaka
  const ar = nu.getFullYear() + Math.floor(k / 4)
  const kk = ((k % 4) + 4) % 4
  return {
    start:   dagtext(new Date(ar, kk * 3, 1)),
    slut:    dagtext(new Date(ar, kk * 3 + 3, 0)),
    etikett: `K${kk + 1} ${ar}`,
  }
}

/** Bokningar inom ett spann. Avbokade räknas inte — de blev aldrig besök. */
function inom(rader: Booking[], från: string, till: string): Booking[] {
  return rader.filter(b => b.status !== 'cancelled' && b.date >= från && b.date <= till)
}

function summa(rader: Booking[]) {
  return {
    antal: rader.length,
    varde: rader.reduce((s, b) => s + (b.price ?? 0), 0),
  }
}

/** Procentuell förändring, eller null när jämförelsetalet är noll. */
export function forandring(nu: number, fore: number): number | null {
  if (!fore) return null
  return Math.round(((nu - fore) / fore) * 100)
}

export function exempelkvartal(nu: Date = new Date()): Kvartalsdata {
  /* Rapporten handlar om kvartalet som gått, inte det som börjat. */
  const k0 = kvartalet(nu, 1)
  const k1 = kvartalet(nu, 2)
  const kf = (() => {
    const d = new Date(nu.getFullYear() - 1, nu.getMonth(), 1)
    return kvartalet(d, 1)
  })()

  const rader   = MOCK_BOOKINGS as Booking[]
  const nuRader = inom(rader, k0.start, k0.slut)
  const foRader = inom(rader, k1.start, k1.slut)
  const fjRader = inom(rader, kf.start, kf.slut)

  const s0 = summa(nuRader), s1 = summa(foRader), s2 = summa(fjRader)

  const snitt = (s: { antal: number; varde: number }) =>
    s.antal ? Math.round(s.varde / s.antal) : 0

  /* Kundstocken. En kund känns igen på namnet i exempeldatan — i skarp drift
     är det telefonnumret, samma nyckel som kundhistoriken använder. */
  const foreNamn = new Set(rader.filter(b => b.date < k0.start && b.status !== 'cancelled').map(b => b.customerName))
  const nuNamn   = new Set(nuRader.map(b => b.customerName))
  const foNamn   = new Set(foRader.map(b => b.customerName))

  const nya          = [...nuNamn].filter(n => !foreNamn.has(n)).length
  const aterkommande = [...nuNamn].filter(n => foreNamn.has(n)).length
  const tappade      = [...foNamn].filter(n => !nuNamn.has(n)).length
  const aterBokningar = nuRader.filter(b => foreNamn.has(b.customerName)).length

  /* Kanalerna: varifrån bokningen kom. Utan värde räknas som direkt. */
  const kanalNamn: Record<string, string> = {
    google: 'Google', facebook: 'Facebook', instagram: 'Instagram', direct: 'Direkt',
  }
  const räknaKanal = (rader: Booking[]) => {
    const m = new Map<string, number>()
    for (const b of rader) {
      const k = kanalNamn[b.channel ?? 'direct'] ?? 'Direkt'
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }
  const kanalNu = räknaKanal(nuRader), kanalFo = räknaKanal(foRader)
  const kanaler = [...kanalNu.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([namn, antal]) => ({ namn, antal, forandring: forandring(antal, kanalFo.get(namn) ?? 0) }))

  /* Behandlingarna, de fem största. */
  const räknaTjanst = (rader: Booking[]) => {
    const m = new Map<string, { antal: number; varde: number }>()
    for (const b of rader) {
      const t = m.get(b.service) ?? { antal: 0, varde: 0 }
      m.set(b.service, { antal: t.antal + 1, varde: t.varde + (b.price ?? 0) })
    }
    return m
  }
  const tjNu = räknaTjanst(nuRader), tjFo = räknaTjanst(foRader)
  const tjanster = [...tjNu.entries()]
    .sort((a, b) => b[1].varde - a[1].varde)
    .slice(0, 5)
    .map(([namn, t]) => ({
      namn, antal: t.antal, varde: t.varde,
      forandring: forandring(t.antal, tjFo.get(namn)?.antal ?? 0),
    }))

  /* De svagaste veckodagarna. Underlag för nästa kvartal, inte en siffra att
     beundra — det är där erbjudanden och annonser gör mest nytta. */
  const perDag = new Map<number, number>()
  for (const b of nuRader) {
    const d = new Date(b.date + 'T12:00:00').getDay()
    perDag.set(d, (perDag.get(d) ?? 0) + 1)
  }
  const svagast = [...perDag.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([dag, antal]) => ({ dag: DAGAR[dag], antal }))

  return {
    salong: { namn: 'Studio Söder', ort: 'Södermalm, Stockholm' },
    period: { nu: k0.etikett, fore: k1.etikett, ifjol: kf.etikett },

    bokningar: { nu: s0.antal, fore: s1.antal, ifjol: s2.antal || null },
    varde:     { nu: s0.varde, fore: s1.varde, ifjol: s2.varde || null },
    snitt:     { nu: snitt(s0), fore: snitt(s1), ifjol: s2.antal ? snitt(s2) : null },

    kunder: {
      nya, aterkommande, tappade,
      andelAter: s0.antal ? Math.round((aterBokningar / s0.antal) * 100) : 0,
    },

    kanaler,
    tjanster,
    svagast,

    /*
     * Härifrån och ned går siffrorna inte att räkna fram ur en kalender.
     * De kommer i skarp drift ur Google-profilen och Search Console, och står
     * här som exempel — märkt i rapporten så att ingen tror något annat.
     */
    synlighet: {
      betyg:   { nu: 4.4, fore: 4.2, ifjol: 4.1 },
      omdomen: { nu: 47, fore: 38, ifjol: 24 },
      sokord: [
        { fras: 'frisör södermalm',   nu: 3.2,  fore: 4.6 },
        { fras: 'balayage stockholm', nu: 7.8,  fore: 9.9 },
        { fras: 'slingor södermalm',  nu: 5.1,  fore: 4.8 },
        { fras: 'keratinbehandling',  nu: 11.4, fore: 14.4 },
      ],
      konkurrenter: [
        { namn: 'Salong Nordin',   betyg: 4.6, omdomen: 112, kartplats: 1 },
        { namn: 'Hair Studio Söder', betyg: 4.3, omdomen: 64, kartplats: 2 },
        { namn: 'Klippoteket',     betyg: 4.1, omdomen: 51,  kartplats: 4 },
      ],
    },

    /* Förslagen är påhittade — de bygger på annonsdata och säsong som ett
       nytt konto inte har. Det är också den del kunden ska ta ställning till. */
    nastaKvartal: [
      {
        rubrik: 'Fyll måndagarna',
        text:   'Måndag är kvartalets svagaste dag med god marginal. Ett erbjudande till kunder som inte varit här på ett halvår, utskickat en torsdag och giltigt måndag till onsdag, fyller den utan att sänka priset resten av veckan.',
      },
      {
        rubrik: 'Balayage rör sig uppåt — hjälp den',
        text:   'Sökordet gick från plats 9,9 till 7,8 under kvartalet utan att ni gjort något särskilt. En egen sida med pris, tidsåtgång och de fem vanligaste frågorna är det som tar den till förstasidan.',
      },
      {
        rubrik: 'Omdömestakten ska hållas',
        text:   'Nio nya omdömen på ett kvartal är bra, och det är takten som väger — inte totalen. Fortsätt fråga vid varje besök, så passerar ni Hair Studio Söder inom två kvartal.',
      },
    ],
  }
}
