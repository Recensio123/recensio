'use client'
import { useLang } from '@/components/LanguageProvider'

// Bilingual page header for server-rendered dashboard pages.
// Server components can't call useLang, so they pass both languages here.
export function PageHeader({
  titleSv,
  titleEn,
  subSv,
  subEn,
  sample = false,
  children,
}: {
  titleSv:   string
  titleEn:   string
  subSv:     string
  subEn:     string
  sample?:   boolean
  children?: React.ReactNode
}) {
  const { lang } = useLang()
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-semibold text-white">{lang === 'sv' ? titleSv : titleEn}</h1>
        <p className="text-slate-400 text-sm mt-1">{lang === 'sv' ? subSv : subEn}</p>
      </div>
      {sample && (
        <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
          {lang === 'sv' ? 'Exempeldata' : 'Sample data'}
        </span>
      )}
      {children}
    </div>
  )
}
