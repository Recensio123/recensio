import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { clearSiteEverywhere } from '@/app/s/[slug]/site-data'

/*
 * Säg upp eller återöppna ett konto.
 *
 * Fältet `closed_at` går att sätta direkt i databasen, men då ligger sajten
 * kvar i upp till ett dygn: uppslaget från adress till företag är cachat, och
 * ingenting berättar för cachen att svaret ändrats. Den här routen gör båda
 * sakerna i rätt ordning, och det är därför den finns.
 *
 * Skyddad av CRON_SECRET, samma nyckel de schemalagda jobben använder. Det är
 * inte en kundfunktion — ingen salong ska kunna säga upp någon annan — utan ett
 * verktyg för den som driver plattformen. Får den en kundvänd yta någon gång
 * ska den flyttas bakom en riktig inloggning med rollkontroll.
 *
 * Vad uppsägningen gör: sajten slutar svara på vår adress, på salongens egen
 * domän och på deras gamla adresser. Omdirigeringen till domänen upphör.
 * Ingenting raderas — allt ligger kvar och kommer tillbaka om kontot öppnas.
 */
export async function POST(req: Request) {
  const nyckel = process.env.CRON_SECRET
  if (!nyckel) {
    return NextResponse.json({ error: 'CRON_SECRET saknas i miljön' }, { status: 500 })
  }

  let kropp: { secret?: string; companyId?: string; slug?: string; closed?: boolean; date?: string }
  try { kropp = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  if (kropp.secret !== nyckel) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (typeof kropp.closed !== 'boolean') {
    return NextResponse.json({ error: 'closed måste vara true eller false' }, { status: 400 })
  }

  /*
   * Slutdatum, inte bara "stängt nu".
   *
   * Ett avtal sägs upp med uppsägningstid: de säger till den femtonde, avtalet
   * löper till månadens slut. Skickas `date` gäller allt fram till dess och
   * ingenting efter — frågan ställs vid varje besök, så ingen behöver köra
   * något jobb vid midnatt. Utan `date` upphör det direkt.
   */
  let slutdatum: string | null = null
  if (kropp.closed) {
    if (kropp.date) {
      const d = new Date(kropp.date)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'date går inte att tolka — använd ÅÅÅÅ-MM-DD' }, { status: 400 })
      }
      slutdatum = d.toISOString()
    } else {
      slutdatum = new Date().toISOString()
    }
  }

  const admin = createAdminClient()

  /* Id eller adress — den som driver plattformen har oftast adressen framför
     sig, inte ett uuid. */
  let companyId = kropp.companyId
  if (!companyId && kropp.slug) {
    const { data } = await admin
      .from('companies').select('id').eq('slug', kropp.slug).maybeSingle()
    companyId = data?.id
  }
  if (!companyId) {
    return NextResponse.json({ error: 'hittade inget företag — skicka companyId eller slug' }, { status: 404 })
  }

  const { error } = await admin
    .from('companies')
    .update({ closed_at: slutdatum })
    .eq('id', companyId)

  if (error) {
    /* Saknas kolumnen har migrationen inte körts. Säg det rakt ut i stället
       för att svara ok på något som inte hände. */
    return NextResponse.json({ error: error.message, hint: 'kör migrationen 20260828_account_closed.sql' }, { status: 500 })
  }

  /* Efter skrivningen, inte före: rensas cachen först kan ett besök hinna
     fylla den igen med det gamla svaret. */
  await clearSiteEverywhere(companyId)

  return NextResponse.json({ ok: true, companyId, closedAt: slutdatum })
}
