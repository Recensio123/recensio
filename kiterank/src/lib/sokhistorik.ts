import type { Period } from '@/components/dashboard/PeriodSelector'

/*
 * Söktrafiken över tid.
 *
 * Ren räkning på de dygnsrader synken sparar. Ligger för sig från vyn av samma
 * skäl som bokningsstatistiken: reglerna ska gå att prova, och de ska inte
 * kunna säga en sak i grafen och en annan i nyckeltalet ovanför.
 *
 * Fram tills nu ritades kurvan ur en påhittad serie, och "mot förra månaden"
 * räknades mot ett hårdkodat tal — även på ett kopplat konto, där märket som
 * säger "Exempeldata" är borta. Det är den sortens siffra som är värre än
 * ingen: den ser mätt ut.
 */

export type Dag = {
  /** YYYY-MM-DD. */
  date:        string
  clicks:      number
  impressions: number
  position:    number | null
}

/** En stapel i diagrammet. */
export type Hink = {
  /** Vad som står under stapeln. */
  etikett:     string
  /** Första dygnet i hinken, för sortering och för att se vad som är vad. */
  från:        string
  clicks:      number
  impressions: number
  /**
   * Alla hinkens dygn finns i underlaget.
   *
   * Två sätt att vara stympad, båda gör stapeln kort utan att det betyder
   * något: den sista för att perioden inte är slut, den första för att minnet
   * inte når längre bak. Samma regel som i bokningsstatistiken.
   */
  hel:         boolean
}

const DAG_MS = 86_400_000

const MÅN_SV = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const MÅN_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Antal dygn perioden omfattar — samma tal som jämförelsen mäter bakåt. */
export const PERIOD_DAGAR: Record<Period, number> = { Weekly: 7, Monthly: 30, Yearly: 365 }

/** Hur många staplar diagrammet ritar när historiken räcker. */
const HINKAR: Record<Period, number> = { Weekly: 8, Monthly: 6, Yearly: 3 }

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parse(datum: string): Date {
  return new Date(`${datum}T12:00:00`)
}

function plus(datum: string, dagar: number): string {
  const d = parse(datum)
  d.setDate(d.getDate() + dagar)
  return iso(d)
}

/** Summan över ett spann, båda ändar inklusive. */
export function summa(dagar: Dag[], från: string, till: string) {
  const inom = dagar.filter(d => d.date >= från && d.date <= till)
  const clicks      = inom.reduce((s, d) => s + d.clicks, 0)
  const impressions = inom.reduce((s, d) => s + d.impressions, 0)

  /*
   * Snittpositionen viktas med visningar, inte med dygn.
   *
   * Ett dygn med tre visningar på plats 2 och ett med tusen på plats 40 är
   * inte plats 21 i genomsnitt. Google viktar likadant inom sitt eget fönster,
   * så det här är samma tal och inte ett eget.
   */
  const vikt = inom.reduce((s, d) => s + (d.position !== null ? d.impressions : 0), 0)
  const pos  = vikt
    ? inom.reduce((s, d) => s + (d.position !== null ? d.position * d.impressions : 0), 0) / vikt
    : null

  return {
    clicks,
    impressions,
    position: pos === null ? null : Math.round(pos * 10) / 10,
    ctr:      impressions ? clicks / impressions : 0,
    dygn:     inom.length,
  }
}

/**
 * Perioden nyckeltalet räknar, och den att jämföra med.
 *
 * Följer samma indelning som staplarna, annars säger de två emot varandra på
 * skärmen: "Klick denna månad" ska vara talet den sista stapeln visar, inte ett
 * rullande trettiodagarsfönster som råkar ligga intill.
 *
 * Månad och år går därför från den första i månaden respektive den första i
 * januari — det är vad orden betyder — och jämförelsen tar lika många dagar in
 * i föregående månad eller år. Halva augusti mot hela juli vore inte en
 * jämförelse utan en dom över att månaden inte hunnit ta slut.
 *
 * Veckan är rullande sju dygn. Den som tittar på en onsdag vill se de senaste
 * sju dygnen, inte en kalendervecka som är två dagar gammal.
 */
export function spann(period: Period, idag: string) {
  if (period === 'Weekly') {
    const n = PERIOD_DAGAR.Weekly
    return {
      från:      plus(idag, -(n - 1)),
      till:      idag,
      förraFrån: plus(idag, -(2 * n - 1)),
      förraTill: plus(idag, -n),
    }
  }

  const d   = parse(idag)
  const år  = d.getFullYear()
  const mån = d.getMonth()

  if (period === 'Monthly') {
    /* Lika många dagar in i förra månaden. Den 31:e i en månad som följer på en
       trettiodagarsmånad kapas av månadsslutet, vilket är rätt: mer finns inte. */
    const start      = new Date(år, mån, 1, 12)
    const förraStart = new Date(år, mån - 1, 1, 12)
    const förraSlut  = new Date(år, mån - 1 + 1, 0, 12)
    const dagIMånad  = Math.min(d.getDate(), förraSlut.getDate())
    return {
      från:      iso(start),
      till:      idag,
      förraFrån: iso(förraStart),
      förraTill: iso(new Date(år, mån - 1, dagIMånad, 12)),
    }
  }

  /* Året: från nyår till idag, mot samma sträcka i fjol. */
  return {
    från:      `${år}-01-01`,
    till:      idag,
    förraFrån: `${år - 1}-01-01`,
    förraTill: iso(new Date(år - 1, mån, d.getDate(), 12)),
  }
}

/**
 * Staplarna, i den uppdelning perioden bestämmer.
 *
 * Vecka räknas bakåt från idag i sjudagarsblock och inte i kalenderveckor: en
 * salong som tittar på onsdagen vill se de senaste sju dygnen mot de sju före,
 * inte en måndag som är två dagar gammal. Månad och år följer däremot kalendern
 * — där är "augusti" en sak alla är överens om.
 */
export function hinkar(dagar: Dag[], period: Period, idag: string, språk: 'sv' | 'en' = 'sv'): Hink[] {
  const namn   = språk === 'sv' ? MÅN_SV : MÅN_EN
  const äldsta = dagar.length ? dagar[0].date : null
  if (!äldsta) return []

  const ut: Hink[] = []

  /* `slut` är periodens sista dygn, inte nödvändigtvis det sista vi räknar.
     Summan klipps vid idag: en stapel för innevarande månad ska visa månaden
     hittills, samma tal som nyckeltalet ovanför. `hel` läser däremot det
     oklippta slutet — det är just skillnaden mellan dem som gör perioden
     ofärdig. */
  const lägg = (från: string, slut: string, etikett: string) => {
    const s   = summa(dagar, från, slut < idag ? slut : idag)
    const hel = från >= äldsta && slut <= idag
    ut.push({ etikett, från, clicks: s.clicks, impressions: s.impressions, hel })
  }

  if (period === 'Weekly') {
    for (let i = HINKAR.Weekly - 1; i >= 0; i--) {
      const till = plus(idag, -i * 7)
      const från = plus(till, -6)
      const d    = parse(från)
      lägg(från, till, `${d.getDate()} ${namn[d.getMonth()]}`)
    }
  } else if (period === 'Monthly') {
    const nu = parse(idag)
    for (let i = HINKAR.Monthly - 1; i >= 0; i--) {
      const start = new Date(nu.getFullYear(), nu.getMonth() - i, 1, 12)
      const slut  = new Date(nu.getFullYear(), nu.getMonth() - i + 1, 0, 12)
      lägg(iso(start), iso(slut), namn[start.getMonth()])
    }
  } else {
    const år = parse(idag).getFullYear()
    for (let i = HINKAR.Yearly - 1; i >= 0; i--) {
      lägg(`${år - i}-01-01`, `${år - i}-12-31`, String(år - i))
    }
  }

  /* Hinkar som ligger helt före det vi mätt ritas inte alls. En rad nollor till
     vänster om kurvan säger "ingen trafik" om något vi inte vet något om. */
  return ut.filter(h => h.från >= äldsta || h.clicks > 0 || h.impressions > 0)
}

/**
 * Hur långt tillbaka minnet räcker, i dygn.
 *
 * Ersätter byggtidsväxeln för den här källan: förut svarade en knapp i
 * sidomenyn på frågan, nu svarar den äldsta raden vi har.
 */
export function mättSedan(dagar: Dag[]): Date | null {
  return dagar.length ? parse(dagar[0].date) : null
}

/** Dygn mellan två datum, för täckningsberäkningen. */
export function dygnMellan(från: string, till: string): number {
  return Math.max(0, Math.round((parse(till).getTime() - parse(från).getTime()) / DAG_MS))
}
