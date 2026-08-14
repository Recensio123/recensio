'use client'
import { Tooltip } from '@/components/Tooltip'

/*
 * One card shape for both halves of Möjligheter.
 *
 * "Satsa på härnäst" was a tight list of rows; "Säsong" was tall coloured
 * blocks with paragraphs and chips. Same panel, same promise — keywords
 * worth going after — read as two unrelated products, so the eye had to
 * relearn the layout on every tab switch.
 *
 * The skeleton is fixed: a name, a line saying why, and two facts on the
 * right. What differs between the two is the content of those slots, and
 * whatever a card needs to add underneath.
 */

export type CardFact = { label: string; value: string; tip?: string }

export function OpportunityCard({ title, subtitle, facts, accent = 'plain', badge, children }: {
  title:    string
  subtitle: string
  facts:    CardFact[]
  /** Seasonal cards run hot when a peak is under way — the shape stays. */
  accent?:  'plain' | 'active' | 'soon'
  badge?:   { text: string; tip?: string }
  children?: React.ReactNode
}) {
  const border =
    accent === 'active' ? 'border-green-500/25 bg-green-500/5' :
    accent === 'soon'   ? 'border-mustard/25 bg-mustard/5'     :
    'border-navy-700 bg-navy-900'

  const badgeCls =
    accent === 'active' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
    accent === 'soon'   ? 'text-mustard border-mustard/30 bg-mustard/10'       :
    'text-slate-500 border-navy-600 bg-navy-700'

  return (
    <div className={`rounded-xl px-4 py-3.5 border ${border}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white text-sm font-medium">{title}</p>
            {badge && (
              <Tooltip text={badge.tip ?? badge.text}>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border cursor-default ${badgeCls}`}>
                  {badge.text}
                </span>
              </Tooltip>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{subtitle}</p>
        </div>

        <div className="shrink-0 text-right space-y-0.5">
          {facts.map(f => (
            <Tooltip key={f.label} text={f.tip ?? f.label}>
              <p className="text-xs text-slate-400 cursor-default">
                {f.label} <span className="text-white">{f.value}</span>
              </p>
            </Tooltip>
          ))}
        </div>
      </div>

      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
