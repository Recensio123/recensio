'use client'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { type Period } from './types'

/*
 * When the visits arrive — one card, two rhythms.
 *
 * Both series have been in the data model and the example data all along and
 * were shown nowhere. For a salon they are among the few figures that change
 * something the same week: which evening to post, when someone should be near
 * the phone, whether Thursday deserves a later closing time.
 *
 * Not a heat map, though a 7 × 24 grid is the obvious way to draw "day and
 * hour" together. Analytics gives the two as separate totals — visits per day,
 * visits per hour — and the crossing of them is not derivable from either. A
 * grid would mean inventing 168 numbers to look precise. The busiest day and
 * the busiest hour are what anyone acts on, and the gold bar in each row says
 * which they are without a sentence repeating it.
 */

const T = {
  sv: {
    title:  'När besöken kommer',
    days:     ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'],
    week:   'Veckan',
    day:    'Dygnet',
    tip:    'Besök per veckodag och per timme, summerat över perioden. Serierna är två skilda mätningar från Google Analytics — de går inte att korsa, så kortet visar dem var för sig.',
  },
  en: {
    title:  'When the visits arrive',
    days:     ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    week:   'Week',
    day:    'Day',
    tip:    'Visits per weekday and per hour, summed over the period. The two are separate measurements from Google Analytics and cannot be crossed, so the card shows them side by side.',
  },
}

function Row({ values, labels, highlight, height = 40 }: {
  values:    number[]
  labels:    (string | null)[]
  highlight: number
  height?:   number
}) {
  const max = Math.max(...values, 1)
  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {values.map((v, i) => (
          <div
            key={i}
            title={String(v)}
            className={`flex-1 rounded-sm ${i === highlight ? 'bg-mustard' : 'bg-navy-600'}`}
            style={{ height: `${Math.max(3, Math.round((v / max) * height))}px` }}
          />
        ))}
      </div>
      {/* Only a few of the hour columns carry a word, and one column is far too
          narrow for it — the empty neighbours give it the room instead. */}
      <div className="flex gap-[2px] mt-1">
        {labels.map((l, i) => (
          <span
            key={i}
            className={`flex-1 min-w-0 text-[9px] text-center whitespace-nowrap ${i === highlight ? 'text-mustard' : 'text-slate-600'}`}
          >
            {l ?? ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/* Weekly ≈ monthly / 4.3, yearly ≈ monthly × 12 — the same deterministic
   factors the rest of the page uses on the mock's monthly base. The shape of
   both rows is unchanged by it; only the heights people hover for are. */
const SCALE: Record<Period, number> = { Weekly: 1 / 4.3, Monthly: 1, Yearly: 12 }

export function VisitTimesCard({ byDay, byHour, period }: {
  byDay:  number[]
  byHour: number[]
  period: Period
}) {
  const { lang } = useLang()
  const t = T[lang]

  if (!byDay?.length || !byHour?.length) return null

  const f = SCALE[period]
  const day  = byDay.map(v => Math.round(v * f))
  const hour = byHour.map(v => Math.round(v * f))

  const peakDay  = day.indexOf(Math.max(...day))
  const peakHour = hour.indexOf(Math.max(...hour))

  /* Every hour gets its own number under its own bar. They are narrow but they
     fit, and a reader looking for "when should someone answer the phone" wants
     the hour itself rather than a word covering six of them. */
  const hourLabels = hour.map((_, h) => String(h))

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 p-4 max-w-2xl">
      <Tooltip text={t.tip}>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">{t.title}</p>
      </Tooltip>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 items-end">
        <span className="text-slate-600 text-[10px] pb-4">{t.week}</span>
        {/* Seven bars across a wide row flatten out at the hour row's height,
            and the whole point is seeing which day stands out. */}
        <Row values={day}  labels={t.days}    highlight={peakDay} height={72} />

        <span className="text-slate-600 text-[10px] pb-4">{t.day}</span>
        <Row values={hour} labels={hourLabels} highlight={peakHour} />
      </div>
    </div>
  )
}
