'use client'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import { SUPPORT_TOPICS } from './topics'
import { pick } from './types'

export default function SupportIndexPage() {
  const { lang } = useLang()
  return (
    <div className="px-4 sm:px-8 py-6 max-w-4xl">
      <h1 className="text-xl font-semibold text-white">
        {lang === 'sv' ? 'Hjälp & guider' : 'Help & guides'}
      </h1>
      <p className="text-slate-400 text-sm mt-1">
        {lang === 'sv'
          ? 'En guide per sida i menyn — vad allt betyder och hur du använder det.'
          : 'One guide per page in the menu — what everything means and how to use it.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
        {SUPPORT_TOPICS.map(topic => (
          <Link
            key={topic.id}
            href={`/dashboard/support/${topic.id}`}
            className="block bg-navy-800 border border-navy-700 rounded-xl p-4 hover:border-mustard/40 transition-colors"
          >
            <p className="text-sm font-semibold text-white">{pick(topic.title, lang)}</p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
              {pick(topic.intro, lang)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
