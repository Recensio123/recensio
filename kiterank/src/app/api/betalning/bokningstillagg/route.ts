import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'
import {
  stripe, stripeKonfigurerad, prisId, tolkaNyckel,
  bokningsnyckel, ärPlan, ärIntervall,
} from '@/lib/betalning'

/*
 * Lägg till eller säg upp bokningstillägget på ett löpande abonnemang.
 *
 * Finns för att Stripes kundportal inte klarar det. Portalen kan byta paket
 * och säga upp hela abonnemanget, men en extra rad går varken att lägga till
 * eller ta bort där — så en salong som bara ville sluta med kalendern hade
 * bara knappen som säger upp hemsidan också.
 *
 * De två riktningarna har olika villkor med flit:
 *
 *   Att lägga till sker direkt, med mellanskillnaden räknad för resten av
 *   perioden. Den som vill börja boka i dag ska kunna det i dag.
 *
 *   Att säga upp löper till periodens slut. Perioden är betald, och kalendern
 *   ligger kvar tills den är slut — samma löfte som vid en vanlig uppsägning.
 *   Ingen kreditering, ingen kalender som försvinner mitt i en vecka full av
 *   inbokade kunder.
 *
 * Bara ägaren. Det är ett avtal som ändras, inte en inställning.
 */

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!stripeKonfigurerad()) return NextResponse.json({ error: 'stripe_saknas' }, { status: 503 })

  const b = await req.json().catch(() => ({}))
  const på = b.på === true

  const admin = createAdminClient()
  const { data: företag } = await admin
    .from('companies')
    .select('id, plan, faktureringsintervall, stripe_subscription_id, subscription_status')
    .eq('id', access!.companyId)
    .maybeSingle()

  const subId = företag?.stripe_subscription_id as string | null
  if (!företag || !subId) {
    return NextResponse.json({ error: 'inget_abonnemang' }, { status: 409 })
  }
  if (företag.subscription_status === 'canceled') {
    return NextResponse.json({ error: 'uppsagt' }, { status: 409 })
  }

  const sub = await stripe().subscriptions.retrieve(subId)
  const bokningsrad = sub.items.data.find(i => tolkaNyckel(i.price?.lookup_key)?.sort === 'bokning')

  if (på) {
    if (bokningsrad) {
      /* Redan på hos Stripe. Kvarvarande uppsägning ångras — det är just det
         den här knappen betyder när tillägget löper ut vid periodens slut. */
      await admin.from('companies').update({ bokning_till: null }).eq('id', företag.id)
      return NextResponse.json({ ok: true, läge: 'ångrad' })
    }

    /* Intervallet måste följa abonnemanget, inte vad kunden en gång valde:
       byter de till årsvis och lägger till bokningen ska årspriset användas. */
    const intervall = ärIntervall(företag.faktureringsintervall)
      ? företag.faktureringsintervall
      : sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'ar' : 'manad'
    if (!ärPlan(företag.plan)) return NextResponse.json({ error: 'ingen_plan' }, { status: 409 })

    const pris = await prisId(bokningsnyckel(företag.plan, intervall))
    if (!pris) return NextResponse.json({ error: 'pris_saknas' }, { status: 503 })

    await stripe().subscriptions.update(subId, {
      items: [{ price: pris, quantity: 1 }],
      proration_behavior: 'create_prorations',
    })
    await admin.from('companies')
      .update({ har_bokning: true, bokning_till: null })
      .eq('id', företag.id)

    return NextResponse.json({ ok: true, läge: 'tillagd' })
  }

  /* Uppsägning. */
  if (!bokningsrad) {
    return NextResponse.json({ error: 'inget_tillagg' }, { status: 409 })
  }

  const till = bokningsrad.current_period_end
    ? new Date(bokningsrad.current_period_end * 1000).toISOString()
    : new Date(Date.now() + 86_400_000).toISOString()

  /*
   * Databasen först, Stripe sedan.
   *
   * Ordningen är hela skyddet. Går datumet inte att spara — kolumnen saknas,
   * databasen svarar inte — och vi ändå tagit bort raden hos Stripe, då står
   * salongen utan kalender mitt i en betald period med inbokade kunder. Att i
   * stället avbryta innan Stripe rörts kostar ett felmeddelande och ingenting
   * annat.
   *
   * Webhooken skriver samma sak strax efter. Att skriva det här också är för
   * att panelen laddas om direkt: en vy som säger "ingår i ditt abonnemang" en
   * sekund efter en uppsägning ser ut som att klicket inte tog.
   */
  const { error: skrivfel } = await admin.from('companies')
    .update({ har_bokning: false, bokning_till: till })
    .eq('id', företag.id)
  if (skrivfel) {
    return NextResponse.json({ error: 'kunde_inte_spara', detalj: skrivfel.message }, { status: 503 })
  }

  /*
   * Raden bort utan kreditering. Kunden har betalat för perioden och får
   * använda den; krediterade vi i stället skulle de få pengar tillbaka och
   * behålla tjänsten, vilket är fel åt andra hållet.
   */
  try {
    await stripe().subscriptions.update(subId, {
      items: [{ id: bokningsrad.id, deleted: true }],
      proration_behavior: 'none',
    })
  } catch (e) {
    /* Stripe vägrade: ta tillbaka vårt eget skrivande, annars visar panelen en
       uppsägning som aldrig skedde och nästa faktura kommer som vanligt. */
    await admin.from('companies')
      .update({ har_bokning: true, bokning_till: null })
      .eq('id', företag.id)
    return NextResponse.json({
      error: 'stripe_fel', detalj: e instanceof Error ? e.message : '',
    }, { status: 502 })
  }

  return NextResponse.json({ ok: true, läge: 'uppsagd', till })
}
