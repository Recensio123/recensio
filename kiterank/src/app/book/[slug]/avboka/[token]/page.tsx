import type { Metadata } from 'next'
import { AvbokaFlow } from './AvbokaFlow'

export const metadata: Metadata = {
  title: 'Avboka tid',
  robots: { index: false, follow: false },
}

export default async function AvbokaPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params
  return <AvbokaFlow slug={slug} token={token} />
}
