import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TEMPLATES_BY_INDUSTRY } from '@/lib/templates'
import { CONTENT } from '@/lib/siteExampleContent'
import { ServicePage } from '@/components/site/ServicePage'
import { siteFontVars, SiteFontFace } from '@/components/SiteFont'
import { SiteStyles } from '@/components/SiteStyles'
import { SiteNav, Footer } from '@/components/site/PreviewSite'

// Template demo — must never compete with published customer sites
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function TjansterPage({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  const { templateId } = await params

  let template = null
  let industry = 'other'

  for (const [ind, templates] of Object.entries(TEMPLATES_BY_INDUSTRY)) {
    const found = templates.find(t => t.id === templateId)
    if (found) {
      template = found
      industry = ind
      break
    }
  }

  if (!template) notFound()

  const content = CONTENT[industry] ?? CONTENT.other
  const home    = `/preview/${template.id}`

  return (
    // The demo wears the theme's typography too — a serif theme shown in a
    // sans-serif is a different theme.
    <div className="kr-site" style={siteFontVars(content, template.font)}>
      <SiteStyles />
      <SiteFontFace content={content} />
      {/* The demo owns its frame now that the price list is only a body — the
          published site gets the same pair from SitePage. */}
      <SiteNav layout={template.layout} c={template.colors} content={content} th={home} base={home} />
      <ServicePage
        template={template}
        industry={industry}
        content={content}
      />
      <Footer c={template.colors} content={content} />
    </div>
  )
}
