import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTemplatesForIndustry, resolveTemplate } from '@/lib/templates'
import { baseIndustry } from '@/lib/industries'
import { CONTENT as SITE_DEFAULTS } from '@/lib/siteExampleContent'
import { PanelEditor } from './PanelEditor'
import { domänData } from '@/lib/domanData'

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
  /* Kopplingen avgör en post i kom igång-listan. En läsning av en indexerad
     kolumn, på en sida som ändå läser tre tabeller. */
  const { data: conn } = await admin
    .from('google_connections').select('refresh_token').eq('company_id', company.id).maybeSingle()
  const googleKopplat = Boolean(conn?.refresh_token)

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
      domäner={await domänData(admin, company.id)}
      googleKopplat={googleKopplat}
    />
  )
}
