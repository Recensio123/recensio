import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TEMPLATES_BY_INDUSTRY } from '@/app/onboarding/templates'
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

  // Find template across all industries
  const templateId = siteConfig?.template ?? null
  let template = null
  let detectedIndustry = company.industry ?? 'other'

  if (templateId) {
    for (const [ind, templates] of Object.entries(TEMPLATES_BY_INDUSTRY)) {
      const found = templates.find(t => t.id === templateId)
      if (found) {
        template         = found
        detectedIndustry = ind
        break
      }
    }
  }

  // Fallback: first template for the company's industry
  if (!template) {
    const industryTemplates = TEMPLATES_BY_INDUSTRY[detectedIndustry]
      ?? TEMPLATES_BY_INDUSTRY.other
    template = industryTemplates[0]
  }

  const defaultContent = SITE_DEFAULTS[detectedIndustry] ?? SITE_DEFAULTS.other
  const initialContent = {
    ...defaultContent,
    businessName: company.name ?? defaultContent.businessName,
    ...(siteConfig?.content as object ?? {}),
  }

  return (
    <PanelEditor
      template={template}
      industry={detectedIndustry}
      initialContent={initialContent}
      siteSlug={company.slug ?? undefined}
      templates={TEMPLATES_BY_INDUSTRY[detectedIndustry] ?? TEMPLATES_BY_INDUSTRY.other}
    />
  )
}
