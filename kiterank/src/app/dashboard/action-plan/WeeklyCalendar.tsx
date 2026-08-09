'use client'
import { useMemo } from 'react'

type RecurringTask = {
  id:       string
  label:    string
  category: keyof typeof CHIP_COLORS
  days:     number[]   // 0 = Sun, 1 = Mon … 6 = Sat
}

const CHIP_COLORS = {
  GBP:     'bg-mustard/15 text-mustard border-mustard/20',
  Reviews: 'bg-green-500/15 text-green-400 border-green-500/20',
  Ads:     'bg-red-500/15 text-red-400 border-red-500/20',
  SEO:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TASKS: RecurringTask[] = [
  { id: 'gbp-post',     label: 'Post to GBP',     category: 'GBP',     days: [1, 4] },  // Mon + Thu
  { id: 'gbp-photo',    label: 'Upload GBP photo', category: 'GBP',     days: [2]    },  // Tue
  { id: 'review-reply', label: 'Reply to reviews', category: 'Reviews', days: [3, 6] },  // Wed + Sat
  { id: 'ad-check',     label: 'Check ad spend',   category: 'Ads',     days: [1]    },  // Mon
  { id: 'seo-check',    label: 'Check rankings',   category: 'SEO',     days: [5]    },  // Fri
]

export function WeeklyCalendar() {
  const days = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return {
        label:   DAY_ABBR[d.getDay()],
        num:     d.getDate(),
        isToday: i === 0,
        tasks:   TASKS.filter(t => t.days.includes(d.getDay())),
      }
    })
  }, [])

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Next 7 days</p>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 border min-h-[88px] ${
              day.isToday
                ? 'bg-navy-700 border-mustard/30'
                : 'bg-navy-800 border-navy-700'
            }`}
          >
            <p className={`text-[11px] font-medium ${day.isToday ? 'text-mustard' : 'text-slate-500'}`}>
              {day.label}
            </p>
            <p className={`text-xl font-bold leading-tight mb-2.5 ${day.isToday ? 'text-white' : 'text-slate-400'}`}>
              {day.num}
            </p>
            <div className="space-y-1">
              {day.tasks.map(task => (
                <div
                  key={task.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium leading-tight ${CHIP_COLORS[task.category]}`}
                >
                  {task.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
