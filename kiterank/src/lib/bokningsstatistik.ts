/*
 * Salongens år, räknat.
 *
 * Kalendern svarar på "vem står var på tisdag". Den här filen svarar på den
 * fråga en ägare ställer sig när tisdagen är över: går det bättre eller sämre
 * än förra kvartalet, och vad beror det på.
 *
 * Rena funktioner utan databas och utan React. Skälet är dels att räkningen ska
 * gå att prova (den ligger i självtesterna), dels att den körs på två ställen:
 * servern buntar årets bokningar till månadsrader, panelen slår ihop
 * månadsraderna till kvartal eller år när man byter period.
 *
 * Uppdelningen är medveten. Månaden är den minsta bunt en salong tänker i, och
 * tolv månadsrader väger ingenting att skicka — medan de tusentals bokningar de
 * är räknade ur gör det. Kvartal och år går att summera ur månader; det omvända
 * går inte, och därför är månaden botten.
 */

/** En månad, färdigräknad. Det här är vad servern skickar. */
export type Månadsrad = {
  /** 'YYYY-MM'. */
  månad:      string
  /** Bokningar som inte avbokades — det salongen faktiskt hade i boken. */
  antal:      number
  /** Summan av priserna, i kronor. */
  värde:      number
  /** Bokade minuter, alltså täljaren i beläggningen. */
  minuter:    number
  genomförda: number
  uteblivna:  number
  avbokade:   number
}

export type Period = 'manad' | 'kvartal' | 'ar'

/** En stapel i diagrammet: en månad, ett kvartal eller ett år. */
export type Stapel = Omit<Månadsrad, 'månad'> & {
  /** Sorterbar nyckel: '2026-08', '2026-K3', '2026'. */
  nyckel:      string
  /** Vad som står under stapeln: 'aug', 'K3', '2026'. */
  etikett:     string
  /** Bemannade minuter i perioden — noll när vi inte kan veta. */
  kapacitet:   number
  /** Andel av den bemannade tiden som var bokad, 0–100. */
  beläggning:  number
  /**
   * Perioden är inte slut än — den innehåller dagens datum.
   *
   * Den sista stapeln är nästan alltid halvfärdig, och utan den här flaggan
   * läses den som ett ras. Värre: en jämförelse som räknar in den säger att
   * det går sämre den första i varje månad, vilket är sant om man menar
   * "hittills" och fel om man menar något alls.
   */
  pågår:       boolean
  /**
   * Alla periodens månader finns i underlaget, och perioden är över.
   *
   * Två olika sätt att vara stympad, och båda gör en stapel kort utan att det
   * betyder något: den sista för att den inte hunnit hända, den första för att
   * minnet inte når längre bak. Ett år bakåt räknat från en månadsgräns börjar
   * mitt i ett kvartal, så det första kvartalet har två månader i sig och ser
   * ut som ett ras som aldrig inträffade.
   *
   * Bara hela perioder jämförs, och bara hela ritas fyllda.
   */
  hel:         boolean
}

const MÅNAD_KORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const MÅNAD_EN   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Bokningsraderna en månadsrad räknas ur. Med flit smalare än Booking: det
 *  här är allt statistiken behöver, och servern ska inte hämta mer än så. */
export type Rå = {
  datum:   string    // YYYY-MM-DD
  status:  string
  pris:    number
  minuter: number
}

/**
 * Bunta bokningar till en månadsrad per månad i spannet.
 *
 * Månader utan en enda bokning kommer med som nollrader. En salong som inte
 * sålde något i februari ska se ett hål i februari — inte ett diagram där
 * februari saknas och mars glider intill januari som om ingenting hänt.
 */
export function månadsrader(rader: Rå[], från: string, till: string): Månadsrad[] {
  const tom = (månad: string): Månadsrad =>
    ({ månad, antal: 0, värde: 0, minuter: 0, genomförda: 0, uteblivna: 0, avbokade: 0 })

  const karta = new Map<string, Månadsrad>()
  for (const m of månaderMellan(från, till)) karta.set(m, tom(m))

  for (const r of rader) {
    const m = r.datum.slice(0, 7)
    const rad = karta.get(m)
    if (!rad) continue                       // utanför spannet

    if (r.status === 'cancelled') { rad.avbokade++; continue }

    /* Avbokade räknas inte som bokningar. Samma regel som kalenderns rutor
       följer — en avbokad tid blev aldrig något, och att räkna den skulle göra
       en dålig månad med många återbud till en bra månad. */
    rad.antal++
    rad.värde   += r.pris
    rad.minuter += r.minuter
    if (r.status === 'completed') rad.genomförda++
    if (r.status === 'no_show')   rad.uteblivna++
  }

  return [...karta.values()].sort((a, b) => a.månad.localeCompare(b.månad))
}

/**
 * Serverns rader, med de månader panelen själv kan räkna ersatta.
 *
 * Servern summerar hela året ur bokningstabellen, men den gjorde det när sidan
 * laddades. Sedan dess kan salongen ha lagt in en bokning, markerat ett besök
 * som avslutat eller tagit emot ett återbud — och då ska stapeln röra sig
 * direkt, inte vid nästa omladdning. Panelen har bokningarna för de senaste
 * trettio dagarna i handen och kan räkna om de månaderna själv.
 *
 * `komplettFrån` är första datum panelens lista är hel från. Bara månader som
 * ligger helt efter det räknas om; en månad där panelen bara har andra halvan
 * skulle annars halveras varje gång någon öppnade fliken. Exempelläget skickar
 * ett datum långt bak, eftersom exempelsalongens hela år ligger i listan.
 */
export function slåIhop(server: Månadsrad[], klient: Rå[], komplettFrån: string): Månadsrad[] {
  return server.map(rad => {
    if (`${rad.månad}-01` < komplettFrån) return rad
    const egen = månadsrader(
      klient.filter(r => r.datum.slice(0, 7) === rad.månad),
      `${rad.månad}-01`, `${rad.månad}-01`,
    )
    return egen[0] ?? rad
  })
}

/** Varje 'YYYY-MM' från och med den ena månaden till och med den andra. */
export function månaderMellan(från: string, till: string): string[] {
  const ut: string[] = []
  let år = Number(från.slice(0, 4)), mån = Number(från.slice(5, 7))
  const sista = till.slice(0, 7)
  for (let i = 0; i < 240; i++) {           // taket är bara ett stopp mot evighet
    const m = `${år}-${String(mån).padStart(2, '0')}`
    ut.push(m)
    if (m >= sista) break
    mån++
    if (mån > 12) { mån = 1; år++ }
  }
  return ut
}

/**
 * Slå ihop månadsrader till den period man tittar på.
 *
 * `kapacitetFör` frågas per månad och inte per period, så att kvartalets
 * kapacitet blir summan av sina tre månader. Räknat direkt på kvartalet hade
 * ett kvartal som sträcker sig över en ändrad öppettid blivit fel på ett sätt
 * som ingen upptäcker.
 */
export function gruppera(
  rader: Månadsrad[],
  period: Period,
  kapacitetFör: (månad: string) => number,
  språk: 'sv' | 'en' = 'sv',
  /** Månaden vi står i, 'YYYY-MM'. Den period som innehåller den är inte slut. */
  idag?: string,
): Stapel[] {
  const namn = språk === 'sv' ? MÅNAD_KORT : MÅNAD_EN

  const nyckelFör = (m: string): { nyckel: string; etikett: string } => {
    const år = m.slice(0, 4), mån = Number(m.slice(5, 7))
    if (period === 'ar')      return { nyckel: år, etikett: år }
    if (period === 'kvartal') {
      const k = Math.floor((mån - 1) / 3) + 1
      return { nyckel: `${år}-K${k}`, etikett: språk === 'sv' ? `K${k}` : `Q${k}` }
    }
    return { nyckel: m, etikett: namn[mån - 1] }
  }

  /* Hur många månader en hel period rymmer. */
  const månaderIPerioden = period === 'ar' ? 12 : period === 'kvartal' ? 3 : 1
  const bidrag = new Map<string, number>()

  const karta = new Map<string, Stapel>()
  for (const r of rader) {
    const { nyckel, etikett } = nyckelFör(r.månad)
    bidrag.set(nyckel, (bidrag.get(nyckel) ?? 0) + 1)
    const s = karta.get(nyckel) ?? {
      nyckel, etikett,
      antal: 0, värde: 0, minuter: 0, genomförda: 0, uteblivna: 0, avbokade: 0,
      kapacitet: 0, beläggning: 0, pågår: false, hel: false,
    }
    if (idag && nyckelFör(idag).nyckel === nyckel) s.pågår = true
    s.antal      += r.antal
    s.värde      += r.värde
    s.minuter    += r.minuter
    s.genomförda += r.genomförda
    s.uteblivna  += r.uteblivna
    s.avbokade   += r.avbokade
    s.kapacitet  += kapacitetFör(r.månad)
    karta.set(nyckel, s)
  }

  for (const s of karta.values()) {
    /* Taket på 100 är samma som kalenderns: en tid lagd utanför den bemannade
       ramen är salongens eget val, och 112% läser som ett fel i koden. */
    s.beläggning = s.kapacitet ? Math.min(100, Math.round((s.minuter / s.kapacitet) * 100)) : 0
    s.hel = !s.pågår && (bidrag.get(s.nyckel) ?? 0) === månaderIPerioden
  }

  const ut = [...karta.values()].sort((a, b) => a.nyckel.localeCompare(b.nyckel))

  /*
   * Årtal bara när det behövs.
   *
   * Tolv månader plus den vi står i betyder att första och sista stapeln heter
   * samma sak — "aug" i båda ändar, och för kvartal "K3" i båda. Att alltid
   * skriva ut året vore brus elva gånger om för att lösa något som händer två
   * gånger; att skriva ut det bara på dubbletterna vore värre, för då ser de två
   * ut att höra ihop och de övriga inte. Alltså: antingen alla eller ingen.
   */
  if (period !== 'ar' && new Set(ut.map(s => s.etikett)).size < ut.length) {
    for (const s of ut) s.etikett = `${s.etikett} -${s.nyckel.slice(2, 4)}`
  }

  return ut
}

/** Finns det något att rita? Nollrader räknas inte — de finns bara för att
 *  tomma månader ska bli hål i diagrammet, inte för att de är data. */
export function harHistorik(rader: Månadsrad[]): boolean {
  return rader.some(r => r.antal > 0 || r.avbokade > 0)
}

/** Hela det visade spannet i en rad — talen som står över diagrammet. */
export function summering(staplar: Stapel[]) {
  const s = staplar.reduce((a, b) => ({
    antal:      a.antal      + b.antal,
    värde:      a.värde      + b.värde,
    minuter:    a.minuter    + b.minuter,
    genomförda: a.genomförda + b.genomförda,
    uteblivna:  a.uteblivna  + b.uteblivna,
    avbokade:   a.avbokade   + b.avbokade,
    kapacitet:  a.kapacitet  + b.kapacitet,
  }), { antal: 0, värde: 0, minuter: 0, genomförda: 0, uteblivna: 0, avbokade: 0, kapacitet: 0 })

  const avgjorda = s.genomförda + s.uteblivna

  return {
    ...s,
    beläggning: s.kapacitet ? Math.min(100, Math.round((s.minuter / s.kapacitet) * 100)) : 0,
    /* Snittet per bokning, inte per kund. Det är den siffra som rör sig när
       salongen börjar sälja behandling i stället för klippning. */
    snitt:      s.antal ? Math.round(s.värde / s.antal) : 0,
    /* Uteblivna mätt mot det som hunnit avgöras, aldrig mot allt bokat — annars
       hade siffran sett bättre ut ju fler kommande tider som låg i boken. */
    uteblivnaAndel: avgjorda ? Math.round((s.uteblivna / avgjorda) * 100) : 0,
    avgjorda,
    /* Återbud mätt mot allt som bokades, avbokade inräknade — nämnaren är alla
       tider som någon gång stod i boken. */
    avbokadeAndel: (s.antal + s.avbokade)
      ? Math.round((s.avbokade / (s.antal + s.avbokade)) * 100)
      : 0,
  }
}

/**
 * Förändring mot föregående lika långa period, i procent.
 *
 * Null när det saknas jämförelse — en salong som öppnade i mars har ingen
 * februari att vara sämre än, och en pil nedåt vore då rent påhitt.
 */
export function förändring(nu: number, förra: number): number | null {
  if (!förra) return null
  return Math.round(((nu - förra) / förra) * 100)
}

/**
 * De två halvor pilarna jämför.
 *
 * Tre regler, och alla tre finns för att en pil ska betyda något:
 *
 * Bara hela perioder räknas — se `hel`. En månad som är halvvägs är inte en
 * dålig månad, och att låta den dra ner jämförelsen skulle göra varje pil röd
 * den första i månaden och grön den sista. Samma sak i andra änden: det första
 * kvartalet i minnet har ofta bara två månader i sig, och att räkna det som ett
 * helt gör den senare halvan bättre än den var.
 *
 * Halva spannet mot halva spannet, inte senaste mot näst senaste. En salong har
 * säsong — juli mot juni säger mest att folk har semester — och en enskild
 * period mot en enskild svänger så mycket att pilen slutar vara ett besked.
 *
 * Null när det inte finns två hela perioder att ställa mot varandra. Med ett år
 * i minnet finns aldrig två färdiga år, och då ska årsvyn sakna pilar hellre än
 * bära påhittade: åtta månader av i år mot fem av i fjol är inte tillväxt, det
 * är två olika långa mätstickor.
 */
export function halvor(staplar: Stapel[]): { nu: Stapel[]; förra: Stapel[] } | null {
  const färdiga = staplar.filter(s => s.hel)
  const halv = Math.floor(färdiga.length / 2)
  if (halv < 1) return null
  return {
    nu:    färdiga.slice(-halv),
    förra: färdiga.slice(-halv * 2, -halv),
  }
}
