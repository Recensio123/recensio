import type { createAdminClient } from '@/lib/supabase/admin'
import { stripeKonfigurerad, sättRabatter } from '@/lib/betalning'
import { betaldaMånader } from '@/lib/betaltid'
import { designAvbetald, avdragGäller, KRAV_MÅNADER, AVBETALD_RABATT_KR } from '@/lib/exportRatt'

/*
 * Avdraget när den formgivna sidan är avbetald.
 *
 * Efter tolv betalda månader har kunden betalat av formgivningen, och då ska
 * de sluta betala för den. Hundrafemtio kronor bort från månadsavgiften, för
 * alltid, på design- och fullservicenivåerna.
 *
 * Mallpaketet får det aldrig — där finns ingen formgivning att betala av.
 *
 * Sker i nattsvepet och inte i webhooken. En kund passerar tolv månader vid en
 * tidpunkt Stripe aldrig meddelar; det finns ingen händelse att lyssna på, bara
 * ett datum som passeras. Ett dygns fördröjning är i sammanhanget ingenting.
 */

type Admin = ReturnType<typeof createAdminClient>

export type Avbetaldrad = {
  id:                     string
  plan:                   string | null
  stripe_customer_id:     string | null
  stripe_subscription_id: string | null
  subscription_status:    string | null
  rabatt_procent:         number | null
  sida_avbetald:          string | null
}

/**
 * Går igenom kunderna och lägger på avdraget för dem som betalat färdigt.
 *
 * Returnerar antalet som fick det, för loggen.
 */
export async function lyftAvbetalda(admin: Admin, nu: Date = new Date()): Promise<number> {
  if (!stripeKonfigurerad()) return 0

  let rader: Avbetaldrad[] = []
  try {
    const { data, error } = await admin
      .from('companies')
      .select('id, plan, stripe_customer_id, stripe_subscription_id, subscription_status, rabatt_procent, sida_avbetald')
      /* Bara de som kan få det, och bara de som inte redan har det. Utan de
         två filtren frågar vi Stripe om varje kunds fakturahistorik varje
         natt, för alltid. */
      .in('plan', ['design', 'fullservice'])
      .is('sida_avbetald', null)
      .not('stripe_subscription_id', 'is', null)
    if (error) throw error
    rader = (data ?? []) as Avbetaldrad[]
  } catch {
    /* Migrationen inte körd — nattsvepet ska gå ändå. */
    return 0
  }

  let lyfta = 0
  for (const rad of rader) {
    if (rad.subscription_status === 'canceled') continue

    const månader = await betaldaMånader(rad.stripe_customer_id)
    if (!designAvbetald(rad.plan, månader)) continue

    try {
      /* Båda rabatterna sätts i ett anrop. En förhandlad procentrabatt ska
         inte försvinna för att avdraget läggs på, och tvärtom. */
      /* Avdraget gäller bara på nivåerna med formgivning — det säkerställs av
         filtret ovan, men skrivs ut här också eftersom det är regeln som
         betyder något: mallpaketet kan aldrig bli billigare. */
      await sättRabatter(
        rad.stripe_subscription_id!,
        rad.rabatt_procent ?? 0,
        avdragGäller(rad.plan, nu.toISOString()),
        AVBETALD_RABATT_KR,
      )
      await admin.from('companies')
        .update({ sida_avbetald: nu.toISOString() })
        .eq('id', rad.id)
      lyfta++
    } catch {
      /* Stripe vägrade — stämpeln sätts inte, så nästa natt försöker vi igen.
         Att stämpla ändå vore att tyst ge bort avdraget utan att lägga på det. */
    }
  }

  return lyfta
}

export { KRAV_MÅNADER, AVBETALD_RABATT_KR }
