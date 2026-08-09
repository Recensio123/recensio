'use client'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

/*
 * Every data page ends here — metrics always resolve into a task.
 * One sentence + one link into the Action Plan; no advice embedded in data views.
 * Callers may pass their own `context` string (already localised by the caller);
 * the default text here is bilingual via useLang.
 */
export function ActionPlanLink({ context }: { context?: string }) {
  const { lang } = useLang()
  const L = {
    sv: {
      fallback: 'Undrar du vad du ska göra åt siffrorna?',
      ready:    'Veckans åtgärder är rangordnade och redo.',
      cta:      'Se veckans åtgärder →',
    },
    en: {
      fallback: 'Wondering what to do about these numbers?',
      ready:    'Your weekly actions are ranked and ready.',
      cta:      "See this week's actions →",
    },
  }[lang]
  return (
    <div className="mt-8 bg-navy-800 rounded-xl border border-mustard/20 px-5 py-4 flex items-center gap-4 flex-wrap">
      <span className="text-mustard text-lg shrink-0">✓</span>
      <p className="flex-1 text-sm text-slate-300 min-w-[200px]">
        {context ?? L.fallback}{' '}
        {L.ready}
      </p>
      <Link
        href="/dashboard#actions"
        className="shrink-0 text-xs bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold px-3.5 py-2 rounded-lg transition-colors"
      >
        {L.cta}
      </Link>
    </div>
  )
}
