'use client'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import { type SupportTopic, pick } from './types'

export function SupportTopicView({ topic }: { topic: SupportTopic }) {
  const { lang } = useLang()
  const t = (l: Parameters<typeof pick>[0]) => pick(l, lang)

  return (
    <div className="px-4 sm:px-8 py-6 max-w-3xl">
      <Link
        href="/dashboard/support"
        className="text-xs text-slate-400 hover:text-mustard transition-colors"
      >
        ← {lang === 'sv' ? 'Alla guider' : 'All guides'}
      </Link>

      <h1 className="text-xl font-semibold text-white mt-3">{t(topic.title)}</h1>
      <p className="text-slate-400 text-sm mt-2 leading-relaxed">{t(topic.intro)}</p>

      {/* Section quick-nav */}
      {topic.sections.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-5">
          {topic.sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-xs text-slate-300 bg-navy-800 border border-navy-700 hover:border-mustard/40 rounded-full px-3 py-1.5 transition-colors"
            >
              {t(s.heading)}
            </a>
          ))}
        </div>
      )}

      <div className="space-y-8 mt-8">
        {topic.sections.map(s => (
          <section key={s.id} id={s.id} className="scroll-mt-20">
            <h2 className="text-base font-semibold text-white border-b border-navy-700 pb-2">
              {t(s.heading)}
            </h2>
            <div className="space-y-3 mt-3">
              {s.body.map((p, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">{t(p)}</p>
              ))}
            </div>
            {s.terms && s.terms.length > 0 && (
              <div className="mt-4 bg-navy-800 border border-navy-700 rounded-xl divide-y divide-navy-700">
                {s.terms.map((term, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-sm font-medium text-mustard">{t(term.term)}</p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{t(term.def)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {topic.sections.length === 0 && (
        <p className="text-sm text-slate-500 mt-8">
          {lang === 'sv' ? 'Guiden fylls på inom kort.' : 'This guide is being written.'}
        </p>
      )}
    </div>
  )
}
