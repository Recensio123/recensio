import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TEMPLATES_BY_INDUSTRY } from '@/app/onboarding/templates'
import { CONTENT } from '../PreviewSite'
import { ServicePage } from './ServicePage'

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

  return (
    <ServicePage
      template={template}
      industry={industry}
      content={content}
    />
  )
}
