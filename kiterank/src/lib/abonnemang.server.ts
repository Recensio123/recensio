import { createAdminClient } from '@/lib/supabase/admin'
import {
  kontoLäge, tillgång, priskatalog, paketnyckel, bokningsnyckel,
  PLANER, SMS_PRIS_KR, ärPlan, ärIntervall,
  type KontoLäge, type Plan, type Intervall, type Tillgång,
  type Priser, type Prislapp,
} from '@/lib/betalning'

export type { Priser, Prislapp }

/*
 * Abonnemangets tillstånd, läst en gång och delat.
 *
 * Tre ställen behöver samma svar: inställningarnas abonnemangsflik, bandet som
 * varnar överst i panelen, och betalväggen som stänger den. Räknade de var för
 * sig skulle de förr eller senare säga olika saker om samma konto — och den
 * dagen står en betalande kund utelåst med en panel som påstår att allt är i
 * sin ordning.
 *
 * Frågan får misslyckas. En databas utan betalmigrationen ska visa produkten,
 * inte ett fel.
 */

export type Abonnemang = {
  läge:          KontoLäge
  tillgång:      Tillgång
  plan:          Plan | null
  /** Kalendern tillgänglig — betald, eller uppsagd men perioden inte slut. */
  harBokning:    boolean
  /** Uppsagt tillägg som fortfarande löper, färdigformaterat datum. */
  bokningTill:   string | null
  /** Köat nedgraderingsbyte som verkställs vid periodens slut. */
  byte:          { till: Plan; datum: string } | null
  /** Väntande uppgraderingsförfrågan hos oss. */
  förfrågan:     Plan | null
  /** Formgivningen avbetald — avdraget gäller. */
  avbetald:      boolean
  intervall:     Intervall | null
  /** Datumet läget hänvisar till, färdigformaterat. */
  datum:         string
  harStripeKund: boolean
  priser:        Priser
}

/** Tomma priser — används när Stripe inte är konfigurerat eller inte svarar. */
function ingaPriser(): Priser {
  return { paket: {}, bokning: {}, uppstart: {}, sms: SMS_PRIS_KR }
}

export async function hämtaPriser(): Promise<Priser> {
  const priser = ingaPriser()
  try {
    const katalog = await priskatalog()
    const lapp = (nyckel: string): Prislapp => {
      const p = katalog.get(nyckel)
      return p ? { belopp: p.belopp, valuta: p.valuta } : null
    }
    for (const p of PLANER) {
      for (const i of ['manad', 'ar'] as const) {
        priser.paket[`${p}_${i}`]    = lapp(paketnyckel(p, i))
        priser.bokning[`${p}_${i}`]  = lapp(bokningsnyckel(p, i))
        priser.uppstart[`${p}_${i}`] = lapp(`uppstart_${p}_${i}`)
      }
    }
  } catch { /* Stripe svarar inte — korten visar offert i stället för fel */ }
  return priser
}

export async function hämtaAbonnemang(companyId: string): Promise<Abonnemang | null> {
  const admin = createAdminClient()

  type Rad = {
    plan: string | null
    har_bokning: boolean | null
    faktureringsintervall: string | null
    subscription_status: string | null
    trial_ends_at: string | null
    current_period_end: string | null
    stripe_customer_id: string | null
    bokning_till: string | null
    plan_byte_till: string | null
    plan_byte_datum: string | null
    sida_avbetald: string | null
  }
  let rad: Rad | null = null

  /* Kolumnerna kom i olika migrationer, så läsningen backar en generation i
     taget i stället för att ge upp. En saknad nykomling ska kosta sin egen
     funktion, inte hela abonnemangsfliken. */
  const BAS      = 'plan, har_bokning, faktureringsintervall, subscription_status, trial_ends_at, current_period_end, stripe_customer_id'
  const ALLT     = `${BAS}, bokning_till, plan_byte_till, plan_byte_datum, sida_avbetald`
  const MED_BYTE = `${BAS}, bokning_till, plan_byte_till, plan_byte_datum`
  const MED_TILL = `${BAS}, bokning_till`

  for (const kolumner of [ALLT, MED_BYTE, MED_TILL, BAS]) {
    const { data, error } = await admin
      .from('companies').select(kolumner).eq('id', companyId).maybeSingle()
    if (!error && data) {
      const d = data as unknown as Record<string, unknown>
      rad = {
        ...d,
        bokning_till:    (d.bokning_till ?? null),
        plan_byte_till:  (d.plan_byte_till ?? null),
        plan_byte_datum: (d.plan_byte_datum ?? null),
        sida_avbetald:   (d.sida_avbetald ?? null),
      } as Rad
      break
    }
  }

  if (!rad) return null

  const läge = kontoLäge(rad)
  const datumRå = läge === 'prov' || läge === 'prov-slut'
    ? rad.trial_ends_at
    : rad.current_period_end

  /*
   * Ett uppsagt tillägg är borta hos Stripe men kvar hos oss perioden ut.
   * Kalendern får därför inte fråga `har_bokning` ensam — den skulle stängas
   * i samma sekund uppsägningen registrerades, mitt i en vecka full av redan
   * inbokade kunder som salongen betalat för att kunna ta emot.
   */
  const kvarTill = rad.bokning_till ? new Date(rad.bokning_till) : null
  const löper    = Boolean(kvarTill && kvarTill > new Date())

  /* En obesvarad uppgraderingsförfrågan. Egen fråga som får misslyckas — en
     databas utan tabellen ska visa abonnemanget ändå. */
  let förfrågan: Plan | null = null
  try {
    const { data } = await admin
      .from('paket_forfragan')
      .select('till_plan')
      .eq('company_id', companyId)
      .is('hanterad', null)
      .order('skapad', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ärPlan(data?.till_plan)) förfrågan = data.till_plan
  } catch { /* tabellen inte skapad */ }

  return {
    läge,
    tillgång:      tillgång(rad),
    plan:          ärPlan(rad.plan) ? rad.plan : null,
    harBokning:    Boolean(rad.har_bokning) || löper,
    bokningTill:   löper ? kvarTill!.toLocaleDateString('sv-SE') : null,
    byte: ärPlan(rad.plan_byte_till) && rad.plan_byte_datum
      ? { till: rad.plan_byte_till, datum: new Date(rad.plan_byte_datum).toLocaleDateString('sv-SE') }
      : null,
    förfrågan,
    avbetald: Boolean(rad.sida_avbetald),
    intervall:     ärIntervall(rad.faktureringsintervall) ? rad.faktureringsintervall : null,
    datum:         datumRå ? new Date(datumRå).toLocaleDateString('sv-SE') : '',
    harStripeKund: Boolean(rad.stripe_customer_id),
    priser:        await hämtaPriser(),
  }
}
