import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'
import {
  stripe, stripeKonfigurerad, prisId, tolkaNyckel, riktning,
  paketnyckel, bokningsnyckel, ärPlan, ärIntervall,
  type Plan, type Intervall,
} from '@/lib/betalning'
import { arkiveraSajt } from '@/lib/sidarkiv'

/*
 * Byte av paket.
 *
 * Två riktningar med två helt olika svar:
 *
 *   Nedåt sker av sig självt, men först när perioden kunden betalat för är
 *   slut. Ett schema hos Stripe håller bytet tills dess, så att faktureringen
 *   blir rätt utan att någon behöver komma ihåg något.
 *
 *   Uppåt är inte ett köp. Mallkunden som vill ha en designad sida har inte
 *   köpt en sida — de har köpt att någon ska formge en, och den någon är du.
 *   Samma sak från design till full service: där ska det finnas plats i
 *   marknadsföringsarbetet. Därför blir en uppgradering en förfrågan som
 *   landar i admin, inte en dragning på kortet.
 *
 * Bara ägaren. Det är avtalet som ändras.
 */

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data: företag } = await admin
    .from('companies')
    .select('id, name, plan, faktureringsintervall, stripe_subscription_id, subscription_status')
    .eq('id', access!.companyId)
    .maybeSingle()
  if (!företag) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const nuvarande = ärPlan(företag.plan) ? företag.plan : null

  /* Ångra ett köat byte. */
  if (b.ångra === true) {
    return ångraByte(admin, företag.id as string, företag.stripe_subscription_id as string | null)
  }

  if (!ärPlan(b.plan)) return NextResponse.json({ error: 'invalid_plan' }, { status: 400 })
  const mål = b.plan as Plan

  const väg = riktning(nuvarande, mål)
  if (väg === 'samma') return NextResponse.json({ error: 'samma_paket' }, { status: 409 })

  if (väg === 'upp') {
    /* Förfrågan, inget mer. Ingen betalning, ingen ändring hos Stripe. */
    const { error } = await admin.from('paket_forfragan').insert({
      company_id: företag.id,
      fran_plan:  nuvarande,
      till_plan:  mål,
      meddelande: typeof b.meddelande === 'string' ? b.meddelande.slice(0, 1000) : null,
    })
    if (error) return NextResponse.json({ error: 'db', detalj: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, läge: 'förfrågan' })
  }

  /* Nedåt: köa bytet till periodens slut. */
  if (!stripeKonfigurerad()) return NextResponse.json({ error: 'stripe_saknas' }, { status: 503 })
  const subId = företag.stripe_subscription_id as string | null
  if (!subId || företag.subscription_status === 'canceled') {
    return NextResponse.json({ error: 'inget_abonnemang' }, { status: 409 })
  }

  const sub = await stripe().subscriptions.retrieve(subId)
  const intervall: Intervall = ärIntervall(företag.faktureringsintervall)
    ? företag.faktureringsintervall
    : sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'ar' : 'manad'

  const paketPris = await prisId(paketnyckel(mål, intervall))
  if (!paketPris) return NextResponse.json({ error: 'pris_saknas' }, { status: 503 })

  /* Bokningen följer med till den nya nivåns pris. Utan det skulle en kund som
     går ned från design till mall behålla 149 i stället för 199, och felet
     skulle aldrig upptäckas av någon. */
  const harBokning = sub.items.data.some(i => tolkaNyckel(i.price?.lookup_key)?.sort === 'bokning')
  const bokningPris = harBokning ? await prisId(bokningsnyckel(mål, intervall)) : null
  const smsRad = sub.items.data.find(i => tolkaNyckel(i.price?.lookup_key)?.sort === 'sms')

  const slut = sub.items.data[0]?.current_period_end
  if (!slut) return NextResponse.json({ error: 'ingen_period' }, { status: 409 })

  try {
    /*
     * Ett schema, inte en direkt ändring.
     *
     * Stripe håller nuvarande paket till periodens slut och byter sedan själv,
     * med rätt fakturering över skarven. Alternativet — att vi kommer ihåg
     * bytet i en egen kolumn och verkställer det i ett nattjobb — flyttar
     * ansvaret för kundens fakturor till vår drifttid.
     */
    const schema = await stripe().subscriptionSchedules.create({ from_subscription: subId })
    const nu = schema.phases[0]

    await stripe().subscriptionSchedules.update(schema.id, {
      end_behavior: 'release',
      phases: [
        {
          items: nu.items.map(i => ({
            price: typeof i.price === 'string' ? i.price : i.price.id,
            ...(i.quantity != null ? { quantity: i.quantity } : {}),
          })),
          start_date: nu.start_date,
          end_date:   slut,
        },
        {
          items: [
            { price: paketPris, quantity: 1 },
            ...(bokningPris ? [{ price: bokningPris, quantity: 1 }] : []),
            ...(smsRad ? [{ price: typeof smsRad.price === 'string' ? smsRad.price : smsRad.price.id }] : []),
          ],
          /* En period lång, sedan släpper schemat abonnemanget fritt med det
             nya paketet. Utan en längd skulle schemat aldrig ta slut, och
             kunden vore låst i en schemalagd prenumeration för alltid. */
          duration: { interval: intervall === 'ar' ? 'year' : 'month', interval_count: 1 },
        },
      ],
    })

    await admin.from('companies').update({
      plan_byte_till:  mål,
      plan_byte_datum: new Date(slut * 1000).toISOString(),
    }).eq('id', företag.id)

    /*
     * En kopia av sajten innan nedgraderingen träder i kraft.
     *
     * Går kunden ned till mallnivån ska den formgivna sidan kunna tas bort
     * utan att arbetet försvinner. Kopian tas nu och inte den dag bytet sker:
     * kunden kan hinna ändra sidan under tiden, och det är den formgivna
     * versionen som är värd att spara — inte vad den råkade ha blivit.
     */
    if (nuvarande !== 'mall') {
      await arkiveraSajt(admin, företag.id as string, {
        etikett:   `Innan nedgradering till ${mål}`,
        anledning: 'Automatisk kopia vid köat paketbyte',
      })
    }

    return NextResponse.json({
      ok: true, läge: 'köat', datum: new Date(slut * 1000).toISOString(),
    })
  } catch (e) {
    return NextResponse.json({
      error: 'stripe_fel', detalj: e instanceof Error ? e.message : '',
    }, { status: 502 })
  }
}

/** Släpper ett köat byte och låter abonnemanget löpa som förut. */
async function ångraByte(
  admin: ReturnType<typeof createAdminClient>, companyId: string, subId: string | null,
) {
  if (stripeKonfigurerad() && subId) {
    try {
      const sub = await stripe().subscriptions.retrieve(subId)
      const schema = sub.schedule as string | Stripe.SubscriptionSchedule | null
      const id = typeof schema === 'string' ? schema : schema?.id
      /* Release och inte cancel: cancel avslutar abonnemanget, release lämnar
         bara tillbaka det till att löpa på egen hand. Skillnaden är en kund
         som ångrar ett byte mot en kund som blir av med allt. */
      if (id) await stripe().subscriptionSchedules.release(id)
    } catch { /* fanns inget schema — då är det redan som det ska */ }
  }

  await admin.from('companies')
    .update({ plan_byte_till: null, plan_byte_datum: null })
    .eq('id', companyId)

  return NextResponse.json({ ok: true, läge: 'ångrat' })
}
