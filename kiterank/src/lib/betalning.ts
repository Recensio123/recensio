import Stripe from 'stripe'

/*
 * Stripe-kopplingen, samlad.
 *
 * Fyra saker bor här och ingen annanstans: klienten, paketmodellen,
 * översättningen mellan Stripes priser och våra paket, och orden panelen
 * sätter på ett abonnemangsläge. Rutterna importerar härifrån — två rutter
 * som var för sig mappar pris till paket är två som glider isär den dag ett
 * pris byts.
 *
 * Allt tål att Stripe inte är konfigurerat än. Under bygget finns inga nycklar,
 * och en betalsida som kraschar utan dem är sämre än en som säger vad som
 * saknas.
 */

export function stripeKonfigurerad(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

let klient: Stripe | null = null

export function stripe(): Stripe {
  if (!stripeKonfigurerad()) throw new Error('STRIPE_SECRET_KEY saknas i miljön')
  klient ??= new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
  return klient
}

/* ── Paketmodellen ───────────────────────────────────────────────────────── */

/*
 * Tre nivåer, och bokningen vid sidan om.
 *
 *   mall        — färdig mall som kunden formar själv
 *   design      — vi formger sajten och startar upp dem
 *   fullservice — design, plattform och löpande marknadsföringshjälp
 *
 * Bokningssystemet är ett tillägg på alla tre, inte en egen nivå. Det är
 * skälet till att `har_bokning` är en egen kolumn och inte härleds ur planen:
 * en designkund med kalender och en mallkund med kalender ska ha samma
 * bokningsfunktion, och den frågan får inte behöva ställas som "vilket paket
 * har de".
 */
export type Plan = 'mall' | 'design' | 'fullservice'
export type Intervall = 'manad' | 'ar'

export const PLANER: Plan[] = ['mall', 'design', 'fullservice']

export const PLAN_TEXT: Record<Plan, { namn: string; kort: string }> = {
  mall:        { namn: 'Hemsida + marknadsföringsplattform',           kort: 'Mall' },
  design:      { namn: 'Designad hemsida + marknadsföringsplattform',  kort: 'Design' },
  fullservice: { namn: 'Full service',                                 kort: 'Full service' },
}

export function ärPlan(v: unknown): v is Plan {
  return v === 'mall' || v === 'design' || v === 'fullservice'
}

/*
 * Nivåernas ordning, och vad ett byte mellan två av dem betyder.
 *
 * Riktningen avgör hela hanteringen. Nedåt kostar oss ingenting och sker av
 * sig självt när kunden använt färdigt perioden de betalat för. Uppåt betyder
 * arbete — en sida ska formges, eller en plats i marknadsföringsarbetet ska
 * finnas ledig — och kan därför aldrig vara en knapp som verkställer sig
 * själv. Den blir en förfrågan.
 */
const RANG: Record<Plan, number> = { mall: 1, design: 2, fullservice: 3 }

export type Bytesriktning = 'upp' | 'ned' | 'samma'

export function riktning(från: Plan | null, till: Plan): Bytesriktning {
  if (!från) return 'upp'
  if (RANG[till] === RANG[från]) return 'samma'
  return RANG[till] > RANG[från] ? 'upp' : 'ned'
}

export function ärIntervall(v: unknown): v is Intervall {
  return v === 'manad' || v === 'ar'
}

/*
 * Priserna hämtas ur Stripe på etikett, inte ur miljövariabler.
 *
 * Med tre nivåer, ett tillägg per nivå och två intervall blir det tretton
 * pris-id:n. Tretton nycklar i en miljöfil är tretton chanser att deploya fel
 * belopp, och de skiljer sig dessutom mellan sandbox och skarpt läge. Stripes
 * `lookup_key` löser det: etiketten är stabil, priset bakom den kan bytas i
 * Stripes gränssnitt, och koden behöver aldrig känna ett belopp.
 *
 * Namngivningen är mekanisk med flit — kan man inte räkna ut etiketten i
 * huvudet kommer den förr eller senare skrivas fel i Stripes formulär.
 */
export function paketnyckel(plan: Plan, intervall: Intervall): string {
  return `${plan}_${intervall}`
}

export function bokningsnyckel(plan: Plan, intervall: Intervall): string {
  return `bokning_${plan}_${intervall}`
}

/*
 * Uppstartsavgiften — ett engångsbelopp på första fakturan.
 *
 * Finns per nivå och intervall, och saknas den är den noll. Det är avsiktligt
 * att den är ett pris och inte en flagga: designarbetet kostar olika mycket
 * på de två övre nivåerna, och den som betalar ett år i förskott har redan
 * täckt arbetet — då lämnas årsetiketten helt enkelt utan pris i Stripe, och
 * ingen avgift läggs på.
 */
export function uppstartsnyckel(plan: Plan, intervall: Intervall): string {
  return `uppstart_${plan}_${intervall}`
}

/** SMS debiteras i efterskott, en krona per skickat meddelande. */
export const SMS_NYCKEL = 'sms'
export const SMS_PRIS_KR = 1

/** Alla etiketter modellen känner till — det Stripe ska innehålla. */
export function allaNycklar(): string[] {
  const ut: string[] = [SMS_NYCKEL]
  for (const p of PLANER) {
    for (const i of ['manad', 'ar'] as Intervall[]) {
      ut.push(paketnyckel(p, i), bokningsnyckel(p, i), uppstartsnyckel(p, i))
    }
  }
  return ut
}

export type Nyckelsort = 'paket' | 'bokning' | 'uppstart' | 'sms'

/** Vad en etikett betyder. Webhooken läser abonnemanget med den här. */
export function tolkaNyckel(
  nyckel: string | null | undefined,
): { sort: Nyckelsort; plan?: Plan; intervall?: Intervall } | null {
  if (!nyckel) return null
  if (nyckel === SMS_NYCKEL) return { sort: 'sms' }

  const prefix: [string, Nyckelsort][] = [['bokning_', 'bokning'], ['uppstart_', 'uppstart']]
  const träff = prefix.find(([p]) => nyckel.startsWith(p))
  const sort: Nyckelsort = träff ? träff[1] : 'paket'

  const [plan, intervall] = (träff ? nyckel.slice(träff[0].length) : nyckel).split('_')
  if (!ärPlan(plan) || !ärIntervall(intervall)) return null
  return { sort, plan, intervall }
}

/* ── Priskatalogen ───────────────────────────────────────────────────────── */

export type Pris = {
  id:        string
  belopp:    number | null   // i hela kronor, null för förbrukningspriser
  valuta:    string
  intervall: Intervall | null
}

let katalog: { vid: number; priser: Map<string, Pris> } | null = null
const KATALOG_TTL = 5 * 60 * 1000

/*
 * Hela priskatalogen i ett anrop, indexerad på etikett.
 *
 * En lista i stället för en fråga per etikett: Stripes filter på lookup_keys
 * tar bara ett fåtal åt gången, och tretton anrop per sidvisning vore absurt.
 * Cachen är kort med flit — byter Jakob ett pris i Stripe ska det slå igenom
 * inom minuter, inte vid nästa deploy.
 */
export async function priskatalog(): Promise<Map<string, Pris>> {
  const nu = Date.now()
  if (katalog && nu - katalog.vid < KATALOG_TTL) return katalog.priser

  const priser = new Map<string, Pris>()
  if (!stripeKonfigurerad()) return priser

  const svar = await stripe().prices.list({ active: true, limit: 100 })
  for (const p of svar.data) {
    if (!p.lookup_key) continue
    const i = p.recurring?.interval
    priser.set(p.lookup_key, {
      id:     p.id,
      belopp: p.unit_amount != null ? p.unit_amount / 100 : null,
      valuta: p.currency.toUpperCase(),
      intervall: i === 'year' ? 'ar' : i === 'month' ? 'manad' : null,
    })
  }

  katalog = { vid: nu, priser }
  return priser
}

/** Pris-id:t bakom en etikett, eller null om priset inte finns i Stripe än. */
export async function prisId(nyckel: string): Promise<string | null> {
  return (await priskatalog()).get(nyckel)?.id ?? null
}

/*
 * Beloppen som de skickas till webbläsaren.
 *
 * Typen bor här och inte i servermodulen som bygger den: panelens kort är en
 * klientkomponent, och en klient som importerar från en modul med
 * databasnyckeln i drar in serverkod i webbläsarbygget.
 */
export type Prislapp = { belopp: number | null; valuta: string } | null

export type Priser = {
  paket:    Partial<Record<string, Prislapp>>   // nyckel: `${plan}_${intervall}`
  bokning:  Partial<Record<string, Prislapp>>   // samma nyckelform
  uppstart: Partial<Record<string, Prislapp>>   // samma nyckelform
  sms:      number
}

/* ── Förbrukning ─────────────────────────────────────────────────────────── */

/**
 * Rapportera ett skickat SMS till Stripes mätare.
 *
 * Ett anrop per meddelande, med radens id som identifierare. Stripe avvisar
 * samma identifierare inom ett dygn, vilket gör ett omförsök ofarligt — och
 * omförsök kommer att ske, eftersom nätverk fallerar mitt i utskickskörningar.
 * Utan den vore priset för ett tappat svar en dubbeldebiterad kund.
 *
 * Kastar aldrig. Ett SMS som gått iväg har gått iväg; att debiteringen inte
 * nådde fram är vårt problem, inte något som ska stoppa nästa utskick.
 */
export async function rapporteraSms(
  kundId: string, identifierare: string,
): Promise<boolean> {
  if (!stripeKonfigurerad()) return false
  try {
    await stripe().billing.meterEvents.create({
      event_name: SMS_NYCKEL,
      identifier: identifierare,
      payload: { stripe_customer_id: kundId, value: '1' },
    })
    return true
  } catch {
    return false
  }
}

/* ── Rabatt ──────────────────────────────────────────────────────────────── */

/*
 * Rabattkupongen för en given procent.
 *
 * En kupong per procentsats, återanvänd mellan kunder: `rabatt-25` är alltid
 * 25 % för evigt, och samma kupong på tio kunder ger tio rader under samma
 * namn i Stripes rapport. Skapades en kupong per kund skulle rapporten bli
 * en telefonkatalog.
 *
 * Kupongen ligger på abonnemanget, aldrig på Stripe-kunden — ett ställe att
 * leta på, och ingen risk att kund- och abonnemangsrabatt staplas till mer
 * än det lovade.
 */
export async function säkraRabattkupong(procent: number): Promise<string> {
  const id = `rabatt-${procent}`
  try {
    await stripe().coupons.retrieve(id)
  } catch {
    await stripe().coupons.create({
      id,
      percent_off: procent,
      duration:    'forever',
      name:        `Rabatt ${procent} %`,
    })
  }
  return id
}

/*
 * Avdraget som börjar gälla när den formgivna sidan är avbetald.
 *
 * Ett fast belopp och inte en procentsats: kunden har betalat av ett arbete
 * med en kostnad, inte förtjänat en rabattnivå. Beloppet syns dessutom som en
 * egen rad på fakturan, vilket gör värdet begripligt — "din sida är betald"
 * säger mer än ett lägre totalbelopp utan förklaring.
 *
 * Kronor. Fungerar bara på abonnemang i SEK; den dagen en kund faktureras i
 * euro behövs en kupong per valuta.
 */
export const AVBETALD_KUPONG = 'sida-avbetald'

export async function säkraAvbetaldKupong(kronor: number): Promise<string> {
  try {
    await stripe().coupons.retrieve(AVBETALD_KUPONG)
  } catch {
    await stripe().coupons.create({
      id:          AVBETALD_KUPONG,
      amount_off:  kronor * 100,
      currency:    'sek',
      duration:    'forever',
      name:        'Hemsidan avbetald',
    })
  }
  return AVBETALD_KUPONG
}

/**
 * Sätter abonnemangets samlade rabatter.
 *
 * Båda i ett anrop, alltid. Stripes `discounts` ersätter hela uppsättningen,
 * så den som sätter en av dem för sig raderar den andra — och det felet är
 * osynligt: kunden får bara en tystare faktura än utlovat, eller en dyrare.
 * Därför finns bara den här vägen in.
 */
export async function sättRabatter(
  abonnemangId: string, procent: number, avbetald: boolean, avbetaldKronor: number,
): Promise<void> {
  const kuponger: { coupon: string }[] = []
  if (procent > 0) kuponger.push({ coupon: await säkraRabattkupong(procent) })
  if (avbetald)    kuponger.push({ coupon: await säkraAvbetaldKupong(avbetaldKronor) })

  if (!kuponger.length) {
    /* Fanns ingen rabatt att ta bort är noll redan sant — inget fel. */
    await stripe().subscriptions.deleteDiscount(abonnemangId).catch(() => {})
    return
  }

  await stripe().subscriptions.update(abonnemangId, { discounts: kuponger })
}

/* ── Kontots läge, som panelen och admin läser det ───────────────────────── */

export type KontoLäge =
  | 'prov'          // registrerad, provperioden löper
  | 'prov-slut'     // provet slut, ingen betalning påbörjad
  | 'aktiv'         // betalande
  | 'förfallen'     // betalning misslyckades, Stripe gör omförsök
  | 'uppsagd'       // uppsagt, löper till periodens slut eller redan slut
  | 'ingen'         // inget abonnemang och inget prov — konton från byggtiden

export type KontoRad = {
  subscription_status: string | null
  trial_ends_at:       string | null
  current_period_end:  string | null
}

/**
 * Ett läge ur kolumnerna. Ren funktion med klockan inskickad, så regeln går
 * att prova — den avgör vad admin ser och så småningom vad betalväggen gör,
 * och en regel med två tolkningar är en kund som stängs av fel dag.
 */
export function kontoLäge(rad: KontoRad, nu: Date = new Date()): KontoLäge {
  const s = rad.subscription_status

  if (s === 'active' || s === 'trialing') return 'aktiv'
  if (s === 'past_due' || s === 'unpaid') return 'förfallen'
  if (s === 'canceled')                   return 'uppsagd'

  /* Inget abonnemang hos Stripe: provet avgör. */
  if (rad.trial_ends_at) {
    return new Date(rad.trial_ends_at) > nu ? 'prov' : 'prov-slut'
  }
  return 'ingen'
}

/* ── Betalväggen ─────────────────────────────────────────────────────────── */

export type Tillgång = {
  /** Panelen stängd — kontot har inget giltigt prov och ingen betalning. */
  låst:      boolean
  varning:   'ingen' | 'prov-slutar' | 'förfallen'
  /** Dagar kvar av provet, när ett prov löper. */
  dagarKvar: number | null
}

/**
 * Vem som släpps in, och vem som varnas.
 *
 * Tre beslut sitter i den här funktionen, och de är alla branschstandard:
 *
 * En nekad betalning låser ingenting med en gång. Stripe gör automatiska
 * omförsök i ett par veckor, och de allra flesta misslyckanden är ett utgånget
 * kort — inte en kund som slutat betala. Att stänga av dem samma dag är att
 * straffa någon för att banken skickade ett nytt kort. Först när Stripe ger
 * upp (`unpaid`) stängs dörren.
 *
 * Ett utgånget prov låser panelen. Det är hela poängen med ett prov.
 *
 * Konton utan både prov och abonnemang släpps in. De är från tiden före
 * betalsystemet, och en betalvägg får aldrig låsa ute någon retroaktivt.
 */
export function tillgång(rad: KontoRad, nu: Date = new Date()): Tillgång {
  const s = rad.subscription_status
  const öppet: Tillgång = { låst: false, varning: 'ingen', dagarKvar: null }

  if (s === 'active' || s === 'trialing') return öppet
  if (s === 'past_due')                   return { ...öppet, varning: 'förfallen' }
  if (s === 'unpaid' || s === 'canceled') return { låst: true, varning: 'ingen', dagarKvar: null }

  if (rad.trial_ends_at) {
    const dagar = Math.ceil((new Date(rad.trial_ends_at).getTime() - nu.getTime()) / 86_400_000)
    if (dagar <= 0) return { låst: true, varning: 'ingen', dagarKvar: 0 }
    /* Tre dagar är när påminnelsen börjar bita. Tidigare och den blir tapet;
       senare och den kommer efter att kunden slutat logga in. */
    return { låst: false, varning: dagar <= 3 ? 'prov-slutar' : 'ingen', dagarKvar: dagar }
  }

  return öppet
}

export const LÄGE_TEXT: Record<KontoLäge, { ord: string; färg: string }> = {
  prov:        { ord: 'På prov',            färg: '#f0b429' },
  'prov-slut': { ord: 'Provet har löpt ut', färg: '#fb923c' },
  aktiv:       { ord: 'Betalande',          färg: '#4ade80' },
  förfallen:   { ord: 'Betalning förfallen', färg: '#f87171' },
  uppsagd:     { ord: 'Uppsagd',            färg: '#94a3b8' },
  ingen:       { ord: 'Inget abonnemang',   färg: '#64748b' },
}
