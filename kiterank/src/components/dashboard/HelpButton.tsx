'use client'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

/**
 * Small "?" button that links to the support guide for the current page.
 * Pass `section` to deep-link to the guide section for an active under-tab.
 */
export function HelpButton({ topic, section }: { topic: string; section?: string }) {
  const { lang } = useLang()
  return (
    <Link
      href={`/dashboard/support/${topic}${section ? `#${section}` : ''}`}
      title={lang === 'sv' ? 'Öppna guiden för den här sidan' : 'Open the guide for this page'}
      aria-label={lang === 'sv' ? 'Hjälp' : 'Help'}
      className="w-6 h-6 rounded-full border border-navy-600 text-slate-400 hover:text-mustard hover:border-mustard/50 flex items-center justify-center text-xs font-semibold transition-colors shrink-0"
    >
      ?
    </Link>
  )
}
