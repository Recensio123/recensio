import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'
import { stripe, stripeKonfigurerad } from '@/lib/betalning'

/*
 * Kundens egen dörr till sitt abonnemang.
 *
 * Stripes kundportal sköter byt-kort, kvitton och uppsägning — färdigbyggt,
 * på svenska, och med kortuppgifterna kvar hos Stripe där de hör hemma. Vi
 * skapar bara en engångslänk dit; att bygga egna vyer för det vore att
 * underhålla en kopia av något Stripe redan gör bättre.
 */

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!stripeKonfigurerad()) {
    return NextResponse.json({ error: 'stripe_saknas' }, { status: 503 })
  }

  const admin = createAdminClient()
  const { data: företag } = await admin
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', access!.companyId)
    .maybeSingle()

  const kundId = företag?.stripe_customer_id as string | null
  /* Ingen Stripe-kund betyder att inget köp påbörjats — då finns ingen portal
     att öppna, och beskedet ska säga det i stället för att 500:a. */
  if (!kundId) return NextResponse.json({ error: 'ingen_kund' }, { status: 409 })

  const bas = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || new URL(req.url).origin

  const session = await stripe().billingPortal.sessions.create({
    customer:   kundId,
    return_url: `${bas}/dashboard/settings?flik=abonnemang`,
  })

  return NextResponse.json({ url: session.url })
}
