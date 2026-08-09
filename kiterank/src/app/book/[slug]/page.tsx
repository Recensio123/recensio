import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingFlow } from './BookingFlow'

type Props = { params: Promise<{ slug: string }> }

function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Real company name when the slug matches one; readable fallback otherwise. */
async function companyNameFor(slug: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin.from('companies').select('name').eq('slug', slug).single()
  return data?.name ?? slugToName(slug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const name = await companyNameFor(slug)
  return {
    // The one page that can rank for "boka <salongens namn>"
    title: `Boka tid — ${name}`,
    description: `Boka din tid hos ${name} online. Välj behandling och tid — bekräftelse direkt.`,
    alternates: { canonical: `/book/${slug}` },
  }
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params
  const companyName = await companyNameFor(slug)
  return <BookingFlow slug={slug} companyName={companyName} />
}
