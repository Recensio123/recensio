
/*
 * Texterna på salongens hemsida, skrivna åt dem.
 *
 * Ett anrop, ett svar, färdiga fält. Ingen agent och ingen loop: uppgiften är
 * fullt specificerad innan den börjar — vi vet vilka fält som ska fyllas och
 * vad vi vet om salongen — och då är en slinga bara långsammare och mindre
 * förutsägbar.
 *
 * Svaret kommer genom ett strikt verktygsanrop i stället för som text.
 * Skillnaden är inte kosmetisk: ett schema med `strict` garanterar att fälten
 * finns och har rätt form, medan prosa hade behövt tolkas — och tolkning av
 * genererad text går sönder just den dagen någon skriver en rubrik med kolon i.
 *
 * Två regler bär hela funktionen, och båda handlar om vad som INTE får hända:
 *
 *   Ingenting hittas på. Antal år, antal anställda, utmärkelser, priser — bara
 *   det salongen själv uppgett. En påhittad mening om tjugo år i branschen står
 *   på en publicerad sida som salongen får svara för.
 *
 *   Priser rörs inte. Prislistan ligger ifylld med branschtypiska siffror som
 *   inte är salongens, och en finare beskrivning runt fel pris gör bara sidan
 *   mer publiceringsfärdig än den är.
 */

/** Det salongen svarar på. Inget är frivilligt — allt annat vet vi redan, och
 *  en fråga vi kan svara på själva är en fråga för mycket. */
export type Svar = {
  /** Platsen som ska stå i texten. Salongens eget val och inte adressen:
   *  vilken nivå som är rätt att synas på vet bara de. */
  plats:    string
  /** Vem som kommer till dem. Det som mest styr tonfall och ordval. */
  målgrupp: string
  /** De tjänster som ska leda texten. Skilt från tjänstelistan vi läser ur
   *  bokningen: den säger vad de säljer, den här säger vad de vill sälja. */
  viktigast:  string
  /** Det som skiljer dem från salongen på andra sidan gatan. */
  annorlunda: string
  ton:      Ton
  /** Hur många som arbetar där. Styr tre saker: berättarrösten, hur Om
   *  oss-texten formuleras, och hur många platser personalsektionen får. */
  antal:    string
}

export type Ton = 'varm' | 'saklig' | 'elegant' | 'lekfull'

export type Röst = 'jag' | 'vi'

/**
 * Siffran ur svaret.
 *
 * "4" och "vi är 4 stycken" ska ge samma sak. Tolv är taket — en salong med
 * fler har en personalsida, inte en sektion.
 */
export function läsAntal(rå: string): number {
  return Math.min(12, Number((rå.match(/\d+/) ?? ['0'])[0]))
}

/**
 * Vem som talar, härlett ur hur många de är.
 *
 * En egen fråga om jag eller vi vore att fråga två gånger om samma sak — den
 * som svarat att hon är ensam har redan sagt att det heter jag. Och ett svar
 * som kan motsäga ett annat blir förr eller senare en text där en ensam frisör
 * skriver "vi" om sig själv.
 */
export function röstFor(antal: number): Röst {
  return antal === 1 ? 'jag' : 'vi'
}

export const TONER: { id: Ton; namn: string; hur: string }[] = [
  { id: 'varm',    namn: 'Varm och personlig', hur: 'du-tilltal, mjukt språk, känns som en människa som pratar' },
  { id: 'saklig',  namn: 'Rakt och proffsigt', hur: 'kort och konkret, inga utropstecken, fakta före känsla' },
  { id: 'elegant', namn: 'Elegant',             hur: 'lugnt och sparsmakat, längre meningar, få ord men valda — aldrig pråligt eller skrytsamt' },
  { id: 'lekfull', namn: 'Lekfullt',           hur: 'ledigt språk, gärna humor, aldrig plojigt eller pratigt' },
]

/** Det vi redan vet och inte behöver fråga om. */
export type Underlag = {
  företag:    string
  ort:        string
  bransch:    string
  /** Namnen ur prislistan. Priserna skickas med flit inte med. */
  tjänster:   string[]
  öppettider: string
}

/** Fälten som fylls. Speglar SiteContent, så svaret går rakt in. */
export type Förslag = {
  heroHeading:    string
  heroBody:       string
  tagline:        string
  ctaText:        string
  aboutTitle:     string
  aboutBody:      string
  /** En beskrivning per tjänst, matchad på namn. Priset är inte med. */
  tjänster:       { namn: string; beskrivning: string }[]
  seoTitle:       string
  seoDescription: string
}
