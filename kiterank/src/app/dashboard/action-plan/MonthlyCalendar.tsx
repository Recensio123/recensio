'use client'
import { useMemo } from 'react'

type RecurringTask = {
  id:       string
  label:    string
  category: keyof typeof CHIP_COLORS
  days:     number[]  // 0 = Sun, 1 = Mon … 6 = Sat
}

const CHIP_COLORS = {
  GBP:     'bg-mustard/15 text-mustard border-mustard/20',
  Reviews: 'bg-green-500/15 text-green-400 border-green-500/20',
  Ads:     'bg-red-500/15 text-red-400 border-red-500/20',
  SEO:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
}

const TASKS: RecurringTask[] = [
  { id: 'gbp-post',     label: 'Post to GBP',      category: 'GBP',     days: [1, 4] },  // Mon + Thu
  { id: 'gbp-photo',    label: 'Upload GBP photo',  category: 'GBP',     days: [2]    },  // Tue
  { id: 'review-reply', label: 'Reply to reviews',  category: 'Reviews', days: [3, 6] },  // Wed + Sat
  { id: 'ad-check',     label: 'Check ad spend',    category: 'Ads',     days: [1]    },  // Mon
  { id: 'seo-check',    label: 'Check rankings',    category: 'SEO',     days: [5]    },  // Fri
]

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Convert JS getDay() (0=Sun) to Mon-based column index (Mon=0 … Sun=6)
const toMondayIdx = (d: number) => (d === 0 ? 6 : d - 1)

export function MonthlyCalendar() {
  const { weeks, todayKey, rangeLabel } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

    // 30-day window starting today
    const dates = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return d
    })

    const end = dates[dates.length - 1]
    const fmt = (d: Date) => d.toLocaleString('default', { month: 'short', day: 'numeric' })
    const rangeLabel = `${fmt(today)} – ${end.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`

    type CalCell = { date: Date; tasks: RecurringTask[] } | null
    const cells: CalCell[] = []

    // Pad start so today lands in the correct weekday column
    for (let i = 0; i < toMondayIdx(today.getDay()); i++) cells.push(null)

    for (const date of dates) {
      cells.push({ date, tasks: TASKS.filter(t => t.days.includes(date.getDay())) })
    }

    // Pad end to complete the final row
    while (cells.length % 7 !== 0) cells.push(null)

    const weeks: CalCell[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

    return { weeks, todayKey, rangeLabel }
  }, [])

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
        Tasks · {rangeLabel}
      </p>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {DAY_HEADERS.map(d => (
          <p key={d} className="text-[10px] font-medium text-slate-600 text-center uppercase tracking-wide py-1">
            {d}
          </p>
        ))}
      </div>

      {/* Week rows */}
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map((cell, ci) => {
              if (!cell) return <div key={ci} className="min-h-[72px]" />
              const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`
              const isToday = key === todayKey
              return (
                <div
                  key={ci}
                  className={`rounded-lg p-2 min-h-[72px] border ${
                    isToday
                      ? 'bg-navy-700 border-mustard/30'
                      : 'bg-navy-800 border-navy-700'
                  }`}
                >
                  <p className={`text-xs font-bold mb-1.5 tabular-nums ${isToday ? 'text-mustard' : 'text-slate-500'}`}>
                    {cell.date.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {cell.tasks.map(task => (
                      <div
                        key={task.id}
                        className={`text-[9px] px-1 py-0.5 rounded border font-medium leading-tight truncate ${CHIP_COLORS[task.category]}`}
                      >
                        {task.label}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
