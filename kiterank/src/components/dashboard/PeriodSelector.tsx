'use client'
import { useLang, type Lang } from '@/components/LanguageProvider'

export type Period = 'Weekly' | 'Monthly' | 'Yearly'

export const PERIOD_LABEL: Record<Period, string> = {
  Weekly:  'WoW',
  Monthly: 'MoM',
  Yearly:  'YoY',
}

const DISPLAY: Record<Lang, Record<Period, string>> = {
  sv: { Weekly: 'Veckovis', Monthly: 'Månadsvis', Yearly: 'Årsvis' },
  en: { Weekly: 'Weekly',   Monthly: 'Monthly',   Yearly: 'Yearly' },
}

export function PeriodSelector({
  period,
  onChange,
}: {
  period:   Period
  onChange: (p: Period) => void
}) {
  const { lang } = useLang()
  return (
    <div className="flex bg-navy-800 border border-navy-700 rounded-lg p-0.5 gap-0.5">
      {(['Weekly', 'Monthly', 'Yearly'] as Period[]).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
            period === p
              ? 'bg-mustard text-navy-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {DISPLAY[lang][p]}
        </button>
      ))}
    </div>
  )
}
