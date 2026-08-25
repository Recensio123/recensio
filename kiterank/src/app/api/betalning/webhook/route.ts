import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  stripe, stripeKonfigurerad, tolkaNyckel, ärPlan, ärIntervall,
  bokningsnyckel, prisId, sättRabatter, AVBETALD_KUPONG,
  type Plan, type Intervall,
} from '@/lib/betalning'
import { avdragGäller, AVBETALD_RABATT_KR } from '@/lib/exportRatt'
import { clearSiteEverywhere } from '@/app/s/[slug]/site-data'

/*
 * Stripes besked in i vårt konto.
 *
 * Stripe är sanningen om pengarna; den här rutten är hur den sanningen når
 * databasen. Varje gång något händer — ett köp går igenom, ett kort nekas, en
 * uppsägning löper ut — ringer Stripe hit, och vi skriver av läget på
 * företagsraden. Panelen och admin läser sedan raden och ringer aldrig Stripe.
 *
 * Signaturen är hela behörigheten. Adressen är offentlig och vem som helst kan
 * skicka en låtsad "betalningen gick igenom" hit — men bara Stripe kan signera
 * den med vår webhook-hemlighet, och allt osignerat avvisas före första
 * databasfrågan.
 *
 * Idempotent med flit: Stripe skickar om besked tills de kvitterats, så samma
 * händelse kan komma två gånger. Allt här är "skriv läget", aldrig "lägg till",
 * och samma besked två gånger skriver samma läge två gånger.
 */

export async function POST(req: NextRequest) {
  if (!stripeKonfigurerad() || !process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json({ error: 'stripe_saknas' }, { status: 503 })
  }

  const signatur = req.headers.get('stripe-signature')
  if (!signatur) return NextResponse.json({ error: 'no_signature' }, { status: 400 })

  /* Råtexten, inte tolkad JSON — signaturen räknas på exakt de byte Stripe
     skickade, och en omserialisering ändrar dem. */
  const kropp = await req.text()

  let händelse: Stripe.Event
  try {
    händelse = stripe().webhooks.constructEvent(
      kropp, signatur, process.env.STRIPE_WEBHOOK_SECRET.trim(),
    )
  } catch {
    return NextResponse.json({ error: 'bad_signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  /*
   * Företaget ett abonnemang gäller.
   *
   * Metadatan först — den skrivs av vår kassa och pekar rakt på rätt rad.
   * Saknas den är abonnemanget upplagt för hand i Stripes panel, vilket är
   * precis vad som händer med offertkunderna: design och full service säljs i
   * samtal med förhandlat pris, och sådana prenumeranter klickas fram där.
   *
   * Då används Stripe-kundens id i stället. Kunden skapade vi själva vid
   * första kontakten och sparade på företagsraden, så kopplingen finns redan.
   * Alternativet vore att Jakob måste klistra in ett UUID i ett metadatafält
   * varje gång, för alltid — och den gången han glömmer betalar kunden utan
   * att kontot öppnas, helt utan felmeddelande.
   */
  const företagFör = async (sub: Stripe.Subscription): Promise<string | null> => {
    const ur = sub.metadata?.company_id as string | undefined
    if (ur) return ur

    const kund = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
    if (!kund) return null

    const { data } = await admin
      .from('companies').select('id').eq('stripe_customer_id', kund).maybeSingle()
    return (data?.id as string | undefined) ?? null
  }

  /*
   * Vad abonnemanget faktiskt innehåller, läst ur raderna.
   *
   * Raderna före metadatan med flit: byter kunden paket eller lägger till
   * bokningen i Stripes kundportal ändras raderna, medan metadatan står kvar
   * som den skrevs vid det första köpet. Den som litar på metadatan låser
   * kunden vid gårdagens paket.
   *
   * Metadatan är reserven för abonnemang som lagts upp för hand i Stripe utan
   * etiketterade priser — offertkunder, till exempel.
   */
  const innehåll = (sub: Stripe.Subscription): {
    plan: Plan | null; bokning: boolean | null; intervall: Intervall | null
  } => {
    let plan: Plan | null = null
    let intervall: Intervall | null = null
    let bokning = false
    let igenkänd = false

    for (const rad of sub.items?.data ?? []) {
      const tolkad = tolkaNyckel(rad.price?.lookup_key)
      if (!tolkad) continue
      igenkänd = true
      if (tolkad.sort === 'paket') {
        plan = tolkad.plan ?? plan
        intervall = tolkad.intervall ?? intervall
      } else if (tolkad.sort === 'bokning') {
        bokning = true
      }
    }

    if (!plan && ärPlan(sub.metadata?.plan)) plan = sub.metadata.plan
    if (!intervall && ärIntervall(sub.metadata?.intervall)) intervall = sub.metadata.intervall

    /*
     * Kände vi inte igen en enda rad är abonnemanget byggt på egna priser —
     * en offert, upplagd för hand. Då vet vi ingenting om bokningen, och att
     * gissa "nej" hade släckt kalendern för en kund som betalar för den.
     * null betyder "rör inte kolumnen"; metadatan får säga sitt om den vill.
     */
    const bokningMeta = sub.metadata?.bokning
    if (!igenkänd) {
      return {
        plan, intervall,
        bokning: bokningMeta === 'ja' ? true : bokningMeta === 'nej' ? false : null,
      }
    }
    return { plan, bokning, intervall }
  }

  const periodSlut = (sub: Stripe.Subscription): string | null => {
    const t = sub.items?.data?.[0]?.current_period_end
    return t ? new Date(t * 1000).toISOString() : null
  }

  switch (händelse.type) {
    /* Abonnemanget skapades eller ändrades: nytt läge, ny period, ev. ny plan.
       Täcker även köpet — checkout.session.completed följs alltid av en
       subscription.created/updated, så en hanterare räcker för båda. */
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = händelse.data.object as Stripe.Subscription
      const id  = await företagFör(sub)
      if (!id) break

      const vad = innehåll(sub)

      await admin.from('companies').update({
        stripe_subscription_id: sub.id,
        subscription_status:    sub.status,
        current_period_end:     periodSlut(sub),
        ...(vad.plan ? { plan: vad.plan } : {}),
        ...(vad.intervall ? { faktureringsintervall: vad.intervall } : {}),
        /* Bokningen skrivs så fort abonnemanget är byggt på våra priser, även
           när svaret är nej: tas tillägget bort i kundportalen ska kalendern
           stängas. Bara ett helt okänt abonnemang lämnar kolumnen orörd. */
        ...(vad.bokning !== null ? { har_bokning: vad.bokning } : {}),
        /* Ett betalt konto har inget prov längre — och inget slutdatum. Den
           som betalar efter en uppsägning öppnas igen av samma rad. */
        closed_at: null,
      }).eq('id', id)

      await clearSiteEverywhere(id)
      await rättaBokningsrad(sub, vad.plan, vad.intervall)
      await rättaRabatter(admin, id, sub, vad.plan)
      break
    }

    /* Uppsägningen har löpt ut. Stripe skickar deleted vid periodens slut när
       kunden sagt upp — det är alltså dagen avtalet faktiskt upphör, och samma
       maskineri som admin-sidans manuella uppsägning tar över: sajten släcks,
       panelen förklarar. Ingenting raderas. */
    case 'customer.subscription.deleted': {
      const sub = händelse.data.object as Stripe.Subscription
      const id  = await företagFör(sub)
      if (!id) break

      await admin.from('companies').update({
        subscription_status: 'canceled',
        closed_at:           new Date().toISOString(),
      }).eq('id', id)

      await clearSiteEverywhere(id)
      break
    }

    /* Kortet gick inte igenom. Stripe sköter omförsök och påminnelser själv —
       vårt jobb är bara att läget syns i admin så att ett samtal kan ske innan
       det blir en avstängning. */
    case 'invoice.payment_failed': {
      const faktura = händelse.data.object as Stripe.Invoice
      const kund = typeof faktura.customer === 'string' ? faktura.customer : faktura.customer?.id
      if (!kund) break
      await admin.from('companies')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', kund)
      break
    }

    /* Allt annat kvitteras utan åtgärd. Stripe skickar dussintals sorter, och
       en okänd är inte ett fel — bara inget vi bryr oss om än. */
  }

  return NextResponse.json({ received: true })
}

/**
 * Låter rabatterna följa med när paketet byts.
 *
 * Avdraget för avbetald formgivning hör till paketet, inte till kunden.
 * Mallpaketet kan aldrig bli billigare — där finns ingen formgivning att
 * betala av, och 150 kr bort från 129 vore att betala kunden för att vara
 * kund. Går någon ned till mall ska avdraget alltså bort, och tillbaka igen
 * om de senare går upp.
 *
 * Här och inte bara där bytet initieras: ett byte kan ske i kundportalen, via
 * ett schema som löper ut mitt i natten, eller för hand i Stripe. Räkningen
 * hör hemma där alla vägar möts.
 */
async function rättaRabatter(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string, sub: Stripe.Subscription, plan: Plan | null,
): Promise<void> {
  if (!plan || sub.status === 'canceled') return

  try {
    const { data } = await admin
      .from('companies')
      .select('rabatt_procent, sida_avbetald')
      .eq('id', companyId)
      .maybeSingle()
    if (!data) return

    const procent  = Number(data.rabatt_procent ?? 0)
    const avdrag   = avdragGäller(plan, data.sida_avbetald as string | null)

    /* Vad abonnemanget bär i dag. Stämmer det redan görs inget anrop — annars
       skulle varje besked från Stripe utlösa en ändring som utlöser ett nytt
       besked. */
    const nu = (sub.discounts ?? []).map(d => {
      if (typeof d === 'string') return null
      const k = d.source?.coupon
      return typeof k === 'string' ? k : k?.id ?? null
    }).filter(Boolean).sort()

    const ska = [
      ...(procent > 0 ? [`rabatt-${procent}`] : []),
      ...(avdrag ? [AVBETALD_KUPONG] : []),
    ].sort()

    if (nu.join('|') === ska.join('|')) return

    await sättRabatter(sub.id, procent, avdrag, AVBETALD_RABATT_KR)
  } catch { /* rabatten får misslyckas; beskedet ska ändå kvitteras */ }
}

/**
 * Låter bokningstillägget följa med när paketet byts.
 *
 * Bokningen kostar olika på olika nivåer och finns i två intervall. Byter en
 * kund paket i Stripes kundportal flyttas bara paketraden — portalen känner
 * inte till att en annan rad hänger ihop med den. Två fel uppstår då, och
 * inget av dem syns för någon:
 *
 *   En designkund som går ned till mall fortsätter betala 149 i stället för
 *   199. Fel åt vårt håll, och ingen upptäcker det.
 *
 *   En kund som byter till årsbetalning behåller en månadsdebiterad
 *   bokningsrad. Stripe tillåter det — jag provade — så abonnemanget blir
 *   halvt årsvis och halvt månadsvis, utan tvåmånadersrabatt på tillägget och
 *   med en faktura ingen kan tyda.
 *
 * Rättelsen sker mot abonnemangets faktiska rader, vilket också gör den
 * självavslutande: efter bytet stämmer nivåerna, och nästa besked från Stripe
 * hittar ingenting att göra.
 */
async function rättaBokningsrad(
  sub: Stripe.Subscription, plan: Plan | null, intervall: Intervall | null,
): Promise<void> {
  if (!plan || !intervall) return
  if (sub.status === 'canceled' || sub.status === 'incomplete_expired') return

  const rad = sub.items?.data?.find(i => tolkaNyckel(i.price?.lookup_key)?.sort === 'bokning')
  if (!rad) return

  const rätt = bokningsnyckel(plan, intervall)
  if (rad.price?.lookup_key === rätt) return

  try {
    const pris = await prisId(rätt)
    /* Saknas priset i Stripe lämnas raden som den är. Ett tillägg på fel nivå
       är fel; ett tillägg som försvinner för att ett pris inte var upplagt är
       värre. */
    if (!pris) return

    await stripe().subscriptions.update(sub.id, {
      items: [{ id: rad.id, price: pris }],
      proration_behavior: 'create_prorations',
    })
  } catch { /* rättelsen får misslyckas; beskedet ska ändå kvitteras */ }
}
