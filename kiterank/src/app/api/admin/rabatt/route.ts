import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'
import { stripeKonfigurerad, sättRabatter } from '@/lib/betalning'
import { avdragGäller, AVBETALD_RABATT_KR } from '@/lib/exportRatt'

/*
 * Sätt en kunds rabatt, 0–100 %.
 *
 * Två saker händer, i den här ordningen: procenten skrivs i databasen, och
 * finns ett löpande abonnemang hos Stripe läggs kupongen på det direkt —
 * nästa faktura blir rabatterad, inklusive SMS-raderna, eftersom kupongen
 * gäller hela fakturan. Noll procent tar bort kupongen.
 *
 * Har kunden inte börjat betala än finns bara databasraden, och det räcker:
 * kassan läser den och lägger på kupongen när köpet görs.
 *
 * Bara plattformsadmin. En rabatt är en prissättning, inte en inställning.
 */

export async function POST(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({}))
  const procent = Number(b.procent)
  if (!b.companyId || !Number.isInteger(procent) || procent < 0 || procent > 100) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: företag } = await admin
    .from('companies')
    .select('id, plan, stripe_subscription_id, subscription_status, sida_avbetald')
    .eq('id', b.companyId)
    .maybeSingle()
  if (!företag) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { error } = await admin
    .from('companies')
    .update({ rabatt_procent: procent })
    .eq('id', företag.id)
  if (error) return NextResponse.json({ error: 'db', detail: error.message }, { status: 500 })

  /* Löpande abonnemang får kupongen med en gång. Utan Stripe-nycklar eller
     abonnemang är databasraden hela åtgärden — kassan tar det därifrån. */
  let stripeSynkad = false
  const subId = företag.stripe_subscription_id as string | null
  const status = företag.subscription_status as string | null
  if (stripeKonfigurerad() && subId && status !== 'canceled') {
    try {
      /* Båda rabatterna sätts i ett anrop. Sattes procenten för sig skulle
         avdraget för avbetald formgivning försvinna tyst — kunden skulle bara
         se en dyrare faktura utan att någon förstod varför. */
      await sättRabatter(
        subId, procent,
        avdragGäller(företag.plan as string | null, företag.sida_avbetald as string | null),
        AVBETALD_RABATT_KR,
      )
      stripeSynkad = true
    } catch (e) {
      /* Databasen är redan skriven — säg det som det är, så rabatten kan
         läggas om i stället för att tyst utebli på fakturan. */
      return NextResponse.json({
        ok: true, stripeSynkad: false,
        varning: e instanceof Error ? e.message : 'stripe_fel',
      })
    }
  }

  return NextResponse.json({ ok: true, stripeSynkad })
}
