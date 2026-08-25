import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { vägFörPlan } from '@/lib/onboarding'
import { priskatalog, paketnyckel } from '@/lib/betalning'
import { SetupWizard } from './SetupWizard'
import type { Paketpriser } from './Paketval'

/*
 * Registreringen, i två utföranden.
 *
 * Paketet avgör vilket. En mallkund väljer sin design själv och får frågan om
 * de hellre vill att vi formger; en premiumkund har redan betalat för att
 * slippa båda delarna och får designfrågorna i stället.
 *
 * Vägen bestäms på servern och inte i webbläsaren. Den styr vad kunden får se
 * och vad som sparas — och ett val som går att ändra i adressfältet är inget
 * val, det är ett förslag.
 */

/*
 * Sidan är öppen, och det är hela poängen.
 *
 * Tidigare kastades den utloggade till inloggningen, som frågade efter e-post
 * och företagsnamn — varpå guiden frågade om samma sak igen två skärmar
 * senare. Kontot skapas i stället som steg 1 här inne, så att den som klickat
 * på ett pris ser alla tre stegen framför sig direkt och vet vad som väntar.
 */
async function hämtaPriser(): Promise<Paketpriser> {
  const kr = (b: number | null | undefined) =>
    b == null ? null : `${b.toLocaleString('sv-SE')} kr`

  try {
    const katalog = await priskatalog()
    return {
      mall:        kr(katalog.get(paketnyckel('mall', 'manad'))?.belopp),
      design:      kr(katalog.get(paketnyckel('design', 'manad'))?.belopp),
      fullservice: kr(katalog.get(paketnyckel('fullservice', 'manad'))?.belopp),
    }
  } catch {
    return { mall: null, design: null, fullservice: null }
  }
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string }>
}) {
  const params   = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let plan: string | null = null
  let provTill: string | null = null

  if (user) {
    try {
      const admin = createAdminClient()
      const { data } = await admin
        .from('companies')
        .select('plan, trial_ends_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      plan = (data?.plan as string | null) ?? null
      const rå = data?.trial_ends_at as string | null
      if (rå) provTill = new Date(rå).toLocaleDateString('sv-SE')
    } catch { /* betalmigrationen inte körd — mallvägen är rätt förval ändå */ }
  }

  /*
   * Adressparametern för den som ännu inte har ett konto.
   *
   * En kund du just sålt paket två till har inget företag i databasen än, så
   * det finns inget `plan` att läsa. Länken från prissektionen bär valet i
   * stället: /onboarding?paket=design. Finns företaget redan vinner det som
   * står där, eftersom en adressrad inte ska kunna uppgradera någon gratis.
   */
  const frånLänk = params.paket === 'design' || params.paket === 'fullservice' ? params.paket : null
  const väg = plan ? vägFörPlan(plan) : vägFörPlan(frånLänk)

  /*
   * Ingen paketvalsskärm för den som redan valt.
   *
   * Kom de via ett priskort är valet gjort, och att fråga om det igen är att
   * be dem ändra sig. Kom de via "Skapa ett konto" har de inte sett några
   * paket alls — då är valet första skärmen, för det avgör vilken guide de
   * ska mötas av. Den som redan har ett företag hos oss slipper båda delarna.
   */
  const behöverVälja = !plan && !frånLänk && !params.paket

  return (
    <SetupWizard
      väg={väg}
      provTill={provTill}
      valtPaket={plan ? null : params.paket ?? null}
      inloggad={!!user}
      behöverVälja={behöverVälja}
      priser={await hämtaPriser()}
      /*
       * Det vi redan vet, förifyllt.
       *
       * Google-inloggningen ger oss adressen utan att någon skrivit den, och
       * ett konto som skapats i ett tidigare försök bär företagsnamnet i sin
       * metadata. Fälten står kvar och går att rätta — men ingen ska behöva
       * skriva samma sak två gånger för att komma igång.
       */
      förifyllt={{
        bizName: (user?.user_metadata?.biz_name as string | undefined) ?? '',
        epost:   user?.email ?? '',
      }}
    />
  )
}
