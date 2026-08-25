import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTemplatesForIndustry, resolveTemplate } from '@/lib/templates'
import { withExamples } from '@/lib/exampleContent'
import type { SiteContent } from '@/components/site/PreviewSite'
import { TemaVal } from './TemaVal'

/*
 * Temavalet, i verklig storlek.
 *
 * Låg tidigare som tolv frimärken i redigerarens vänsterspalt — en teckning av
 * varje tema, inte temat. Ett val som byter hela sidans komposition går inte
 * att göra på en bild som är 180 pixlar bred.
 *
 * Här ritas varje tema med salongens egen text, egna priser och egna bilder.
 * Frågan blir då "hur ser min sida ut i det här temat?" i stället för "vilken
 * av de här teckningarna gillar jag?", och det är den frågan som faktiskt ska
 * besvaras.
 */
export default async function TemanPage() {
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
    .maybeSingle()

  const trade   = company.industry ?? 'other'
  const val     = getTemplatesForIndustry(trade)
  const nuvarande = resolveTemplate(siteConfig?.template) ?? val[0]

  /* Samma påfyllning som redigeraren gör innan den ritar: tomma fält visas med
     våra exempel så att en halvfärdig sida inte ser trasig ut i något tema. */
  const innehåll = withExamples(
    (siteConfig?.content ?? {}) as Partial<SiteContent>,
    trade,
  ) as SiteContent

  return (
    <TemaVal
      teman={val}
      nuvarandeId={nuvarande.id}
      innehåll={innehåll}
      industry={trade}
      slug={company.slug ?? ''}
    />
  )
}
