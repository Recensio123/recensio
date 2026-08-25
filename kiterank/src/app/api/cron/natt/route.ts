import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncReviews, syncPerformance, saveSnapshot, syncSearchConsole, syncAds, syncGA4 } from '@/lib/sync'
import { gallraForetag } from '@/lib/gallring'
import { påminnOmProv } from '@/lib/provpaminnelse'
import { lyftAvbetalda } from '@/lib/avbetald'

/*
 * Nattsvepet: alla Google-källor och gallringen, en gång per dygn.
 *
 * Ett svep i stället för fem klockslag. Källorna — profilsiffror, sök,
 * annonser, besök — räknas om hos Google en gång per dygn, så oftare än så
 * finns inget nytt att hämta; och fem separata jobb på fem timmar var bara
 * spretighet, inte design. Ett svep är en logg att läsa och en tid att känna
 * till.
 *
 * Schemat i vercel.json: 03:00 UTC, alltså 05:00 svensk sommartid — klart
 * innan salongen öppnar panelen med morgonkaffet. Recensioner och utskick går
 * inte här: de är händelser respektive klockstyrda meddelanden och har sin
 * egen kvartspuls (sync-reviews, send-messages).
 *
 * Gallringen sist — den skriver i tabeller som synkarna läser, och natten är
 * lång nog för båda. De gamla enkelrutterna finns kvar för manuella körningar
 * och knapparna i panelen.
 */

/* Fyra Google-tjänster per kund tar en stund. Vercels standardtak på tio
 * sekunder hade klippt mitt i, och en halvkörd synk ser ut som en lyckad. */
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: connections } = await admin
    .from('google_connections')
    .select('company_id')
    .not('refresh_token', 'is', null)

  /* Kunderna parallellt, källorna per kund parallellt. allSettled hela vägen:
     en kund vars åtkomst dött ska inte stoppa de andras natt. */
  const resultat = await Promise.allSettled(
    (connections ?? []).map(async ({ company_id }) => {
      const [reviews, perf] = await Promise.all([
        syncReviews(company_id),
        syncPerformance(company_id),
      ])
      await Promise.allSettled([
        saveSnapshot(company_id, {
          rating:            reviews?.rating,
          reviewCount:       reviews?.reviewCount,
          reviewsResponded:  reviews?.reviewsResponded,
          impressions:       perf?.impressions,
          websiteClicks:     perf?.websiteClicks,
          directionRequests: perf?.directionRequests,
        }),
        syncSearchConsole(company_id),
        syncAds(company_id),
        syncGA4(company_id),
      ])
    }),
  )

  /* Gallringen gäller alla företag, inte bara de Google-kopplade. */
  const { data: companies } = await admin.from('companies').select('id')
  const gallring = await Promise.allSettled(
    (companies ?? []).map(c => gallraForetag(admin, c.id)),
  )
  const gallrade = gallring.reduce(
    (s, r) => s + (r.status === 'fulfilled' ? r.value : 0), 0,
  )

  /* Provpåminnelserna sist. De rör inga tabeller synkarna läser, och ett fel
     i ett mailutskick ska aldrig kunna fälla nattens datainsamling. */
  let påminda = 0
  try {
    påminda = await påminnOmProv(admin)
  } catch { /* mailet får misslyckas; siffrorna är viktigare */ }

  /* Avdraget för avbetald formgivning. En kund passerar tolv månader vid en
     tidpunkt Stripe aldrig meddelar — det finns ingen händelse att lyssna på,
     bara ett datum som passeras. */
  let avbetalda = 0
  try {
    avbetalda = await lyftAvbetalda(admin)
  } catch { /* rabatten får misslyckas; nästa natt försöker igen */ }

  return NextResponse.json({
    synkade:  resultat.filter(r => r.status === 'fulfilled').length,
    totalt:   connections?.length ?? 0,
    gallrade,
    påminda,
    avbetalda,
  })
}
