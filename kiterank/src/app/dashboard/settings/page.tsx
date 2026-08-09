import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsForm } from './SettingsForm'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { HelpButton } from '@/components/dashboard/HelpButton'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin
        .from('companies')
        .select('name, country, city, postal_code, industry, website')
        .eq('user_id', user.id)
        .single()
    : { data: null }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      <PageHeader
        titleSv="Inställningar"
        titleEn="Settings"
        subSv="Hantera dina företagsuppgifter och var du vill synas"
        subEn="Manage your business details and location targeting"
      >
        <HelpButton topic="installningar" />
      </PageHeader>

      <SettingsForm
        name={company?.name ?? ''}
        country={company?.country ?? null}
        city={company?.city ?? null}
        postalCode={company?.postal_code ?? null}
        industry={company?.industry ?? null}
        website={company?.website ?? null}
        justConnected={params.connected === 'true'}
      />
    </div>
  )
}
