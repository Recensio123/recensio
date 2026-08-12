import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTemplatesForIndustry, resolveTemplate } from '@/app/onboarding/templates'
import { baseIndustry } from '@/lib/industries'
import { SITE_DEFAULTS } from './SiteEditor'
import { PanelEditor } from './PanelEditor'

export default async function WebbplatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id, name, industry, slug')
    .eq('user_id', user.id)
    .single()

  if (!company) redirect('/onboarding')

  const { data: siteConfig } = await admin
    .from('site_config')
    .select('template, content')
    .eq('company_id', company.id)
    .single()

  /* The trade the customer told us, and nothing else, decides what they are
   * offered. The chosen template used to overwrite it — whichever design
   * family happened to contain that id won — so a nail studio that picked a
   * design also shared with hair salons was served hair-salon wording and the
   * hair-salon list. The trade is theirs; a design choice cannot change it. */
  const trade  = company.industry ?? 'other'

  /* Every salon trade picks from the same list — the trade decides the
   * example content, never which designs are on offer. */
  const choices  = getTemplatesForIndustry(trade)
  const template = resolveTemplate(siteConfig?.template) ?? choices[0]

  const defaultContent = SITE_DEFAULTS[baseIndustry(trade)] ?? SITE_DEFAULTS.other
  const initialContent = {
    ...defaultContent,
    businessName: company.name ?? defaultContent.businessName,
    ...(siteConfig?.content as object ?? {}),
  }

  return (
    <PanelEditor
      template={template}
      industry={trade}
      initialContent={initialContent}
      siteSlug={company.slug ?? undefined}
      templates={choices}
    />
  )
}
