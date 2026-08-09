import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TEMPLATES_BY_INDUSTRY } from '@/app/onboarding/templates'
import { PreviewSite } from './PreviewSite'
import { PreviewBar } from './PreviewBar'

const INDUSTRY_LABELS: Record<string, { name: string; desc: string }> = {
  salon:      { name: 'Frisörsalong',         desc: 'Professionell hårvård och styling. Boka din tid enkelt online.' },
  beauty:     { name: 'Skönhetssalong',        desc: 'Professionell skönhetsvård. Boka behandling enkelt online.' },
  spa:        { name: 'Spa & Wellness',         desc: 'Avkoppling och välmående. Boka din behandling online.' },
  restaurant: { name: 'Restaurang',            desc: 'Hemlagad mat med lokala råvaror. Boka bord online.' },
  craftsman:  { name: 'Bygg & Hantverk',       desc: 'Professionellt hantverk sedan decennier. Begär offert idag.' },
  cleaning:   { name: 'Städservice',           desc: 'Professionell städning med nöjd-kund-garanti.' },
  fitness:    { name: 'Gym & Träning',          desc: 'Gruppträning och personlig coaching. Kom igång idag.' },
  other:      { name: 'Företag',               desc: 'Professionell service med kvalitet och engagemang.' },
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params:       Promise<{ templateId: string }>
  searchParams: Promise<{ industry?: string; name?: string }>
}): Promise<Metadata> {
  const { templateId }     = await params
  const { industry, name } = await searchParams

  let detectedIndustry = industry ?? 'other'
  for (const [ind, templates] of Object.entries(TEMPLATES_BY_INDUSTRY)) {
    if (templates.find(t => t.id === templateId)) {
      detectedIndustry = industry ?? ind
      break
    }
  }

  const meta  = INDUSTRY_LABELS[detectedIndustry] ?? INDUSTRY_LABELS.other
  const title = name ?? meta.name

  return {
    title,
    description: meta.desc,
    openGraph: {
      title,
      description: meta.desc,
      type:        'website',
    },
    // Every customer's site is built from these demos. Indexed previews would
    // compete with the published sites as duplicate content, so they must
    // never enter the index — the customer's own /s/-page is the real one.
    robots: { index: false, follow: false },
  }
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params:       Promise<{ templateId: string }>
  searchParams: Promise<{ industry?: string; standalone?: string; name?: string }>
}) {
  const { templateId }            = await params
  const { industry, standalone, name } = await searchParams

  // Find template across all industries
  let template = null
  let detectedIndustry = 'other'

  for (const [ind, templates] of Object.entries(TEMPLATES_BY_INDUSTRY)) {
    const found = templates.find(t => t.id === templateId)
    if (found) {
      template         = found
      detectedIndustry = ind
      break
    }
  }

  if (!template) notFound()

  return (
    <>
      <PreviewSite template={template} industry={industry ?? detectedIndustry} />
      {standalone === 'true' && (
        <PreviewBar templateName={name ?? template!.name} />
      )}
    </>
  )
}
