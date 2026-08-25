import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess } from '@/lib/access'
import { SettingsForm } from './SettingsForm'
import { InstallningarFlikar } from './InstallningarFlikar'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { SprakVal } from '@/components/dashboard/SprakVal'
import { hämtaAbonnemang } from '@/lib/abonnemang.server'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; betalning?: string; flik?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = await currentAccess()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin
        .from('companies')
        .select('name, country, city, postal_code, industry, website')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  /* Abonnemanget läses av samma funktion som panelens betalvägg använder.
     Två uträkningar av samma sak vore två som kan säga olika. */
  const abonnemang = access ? await hämtaAbonnemang(access.companyId) : null

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      <PageHeader
        titleSv="Inställningar"
        titleEn="Settings"
        subSv="Hantera dina företagsuppgifter och var du vill synas"
        subEn="Manage your business details and location targeting"
      >
        <HelpButton topic="installningar" />
      </PageHeader>

      <InstallningarFlikar
        startFlik={params.flik === 'abonnemang' || params.betalning ? 'abonnemang' : 'foretag'}
        abonnemang={abonnemang ? {
          läge:          abonnemang.läge,
          plan:          abonnemang.plan,
          harBokning:    abonnemang.harBokning,
          bokningTill:   abonnemang.bokningTill,
          byte:          abonnemang.byte,
          förfrågan:     abonnemang.förfrågan,
          avbetald:      abonnemang.avbetald,
          intervall:     abonnemang.intervall,
          datum:         abonnemang.datum,
          harStripeKund: abonnemang.harStripeKund,
          priser:        abonnemang.priser,
          kvitto: params.betalning === 'klar' ? 'klar'
            : params.betalning === 'avbruten' ? 'avbruten' : null,
        } : null}
      >
        <div className="max-w-2xl">
          <SettingsForm
            name={company?.name ?? ''}
            country={company?.country ?? null}
            city={company?.city ?? null}
            postalCode={company?.postal_code ?? null}
            industry={company?.industry ?? null}
            website={company?.website ?? null}
            justConnected={params.connected === 'true'}
          />

          <SprakVal />
        </div>
      </InstallningarFlikar>
    </div>
  )
}
