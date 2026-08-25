import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'
import {
  stripe, stripeKonfigurerad, prisId, säkraRabattkupong,
  paketnyckel, bokningsnyckel, uppstartsnyckel, SMS_NYCKEL,
  ärPlan, ärIntervall,
} from '@/lib/betalning'

/*
 * Starta ett köp.
 *
 * Rutten skapar en Checkout-session hos Stripe och skickar tillbaka adressen —
 * själva betalsidan är Stripes, vilket är hela poängen: kortnumret passerar
 * aldrig vår server, och deras sida sköter 3D-Secure, Klarna-knappar och allt
 * annat kortvärlden kräver.
 *
 * Paketet och bokningstillägget blir två rader på samma abonnemang, inte två
 * abonnemang. En kund ska ha en faktura och ett förfallodatum, inte två som
 * glider isär.
 *
 * Bara ägaren. Priser och avtal är inte en receptionists att teckna.
 */

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!stripeKonfigurerad()) {
    return NextResponse.json({ error: 'stripe_saknas' }, { status: 503 })
  }

  const b = await req.json().catch(() => ({}))
  if (!ärPlan(b.plan)) return NextResponse.json({ error: 'invalid_plan' }, { status: 400 })
  const intervall = ärIntervall(b.intervall) ? b.intervall : 'manad'
  const villHaBokning = b.bokning === true

  const paketPris = await prisId(paketnyckel(b.plan, intervall))
  if (!paketPris) return NextResponse.json({ error: 'pris_saknas' }, { status: 503 })

  /* Saknas bokningspriset säljs paketet ändå, utan tillägget. Ett halvt köp
     är bättre än ett stoppat — och admin ser i priskontrollen vad som fattas. */
  const bokningPris = villHaBokning
    ? await prisId(bokningsnyckel(b.plan, intervall))
    : null

  /* Uppstartsavgiften är ett engångspris och läggs som en rad i samma session.
     Stripe drar den på första fakturan och aldrig igen. Finns ingen etikett
     för den här kombinationen är avgiften noll — så ser årsbetalning ut när
     arbetet redan är täckt av förskottet. */
  const uppstartPris = await prisId(uppstartsnyckel(b.plan, intervall))

  /*
   * SMS-raden följer alltid med, även för den som inte köper bokningen.
   *
   * Raden kostar noll tills något skickas — den är bara mätarens plats på
   * fakturan. Utan den samlas förbrukningen hos Stripe utan någonstans att
   * hamna, och den dagen kunden lägger till bokningen i kundportalen går
   * SMS:en obetalda utan att något syns. En nollrad är billigare än en tyst
   * intäktsförlust.
   */
  const smsPris = await prisId(SMS_NYCKEL)

  const admin = createAdminClient()
  const { data: företag } = await admin
    .from('companies')
    .select('id, name, stripe_customer_id')
    .eq('id', access!.companyId)
    .maybeSingle()
  if (!företag) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  /*
   * En Stripe-kund per företag, skapad första gången och återanvänd sedan.
   * Skapades en ny per köpförsök skulle en kund som avbröt checkouten tre
   * gånger finnas fyra gånger hos Stripe, och kvitton och kortuppgifter
   * spridas över dem.
   */
  let kundId = företag.stripe_customer_id as string | null
  if (!kundId) {
    const kund = await stripe().customers.create({
      name:     (företag.name as string) ?? undefined,
      email:    access!.email ?? undefined,
      metadata: { company_id: företag.id as string },
    })
    kundId = kund.id
    await admin.from('companies').update({ stripe_customer_id: kundId }).eq('id', företag.id)
  }

  const bas = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || new URL(req.url).origin

  /* Rabatt som admin lovat följer med in i kassan, så kunden ser det
     rabatterade priset innan de bekräftar — inte fullpris med en tyst
     justering efteråt. Egen fråga som får misslyckas: en databas utan
     rabattmigrationen betyder ingen rabatt, inte en trasig kassa. */
  let rabatt = 0
  try {
    const { data } = await admin
      .from('companies').select('rabatt_procent').eq('id', företag.id).maybeSingle()
    rabatt = (data?.rabatt_procent as number | undefined) ?? 0
  } catch { /* rabattmigrationen inte körd */ }

  const session = await stripe().checkout.sessions.create({
    customer:   kundId,
    mode:       'subscription',
    line_items: [
      { price: paketPris, quantity: 1 },
      ...(bokningPris ? [{ price: bokningPris, quantity: 1 }] : []),
      ...(uppstartPris ? [{ price: uppstartPris, quantity: 1 }] : []),
      /* Förbrukningsrader har inget antal — Stripe räknar det ur mätaren. */
      ...(smsPris ? [{ price: smsPris }] : []),
    ],
    /* Momsen räknas av Stripe Tax utifrån kundens land, och EU-företag får
       lämna sitt momsnummer — då blir det omvänd skattskyldighet i stället
       för svensk moms, med rätt notering på fakturan. */
    automatic_tax:      { enabled: true },
    tax_id_collection:  { enabled: true },
    billing_address_collection: 'required',
    customer_update:    { address: 'auto', name: 'auto' },
    /* company_id på abonnemanget, inte bara på kunden: webhooken ska aldrig
       behöva gissa vilket konto ett Stripe-besked gäller. */
    subscription_data:  {
      metadata: { company_id: företag.id as string, plan: b.plan, intervall },
    },
    ...(rabatt > 0 ? { discounts: [{ coupon: await säkraRabattkupong(rabatt) }] } : {}),
    success_url: `${bas}/dashboard/settings?flik=abonnemang&betalning=klar`,
    cancel_url:  `${bas}/dashboard/settings?flik=abonnemang&betalning=avbruten`,
  })

  return NextResponse.json({ url: session.url })
}
