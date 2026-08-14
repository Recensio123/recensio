'use client'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { type Booking } from './data'
import { bookingColor, clockOf, isoDate, weekStart, type StaffColor } from './kalender'

/*
 * The month — the planning view.
 *
 * Nobody reads exact times from a month grid, so this one does not pretend
 * to show them. Each day is a stack of coloured lines: how full, and whose
 * chairs. Clicking a day drops into it. The booked value per day is there
 * because a month is where a salon notices that Tuesdays are worth half of
 * what Fridays are.
 */

const DAYS: Record<Lang, string[]> = {
  sv: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

const T = {
  sv: { more: (n: number) => `+${n} till`, add: '+ Boka', busy: 'Upptaget' },
  en: { more: (n: number) => `+${n} more`, add: '+ Book', busy: 'Busy' },
}

const MAX_ROWS = 3

export function KalenderManad({ date, bookings, colors, showValue = true, onSlotClick, onSelect, onPickDay }: {
  date:     string
  bookings: Booking[]
  colors:   Map<string | null, StaffColor>
  /** Takings are the owner's business. */
  showValue?: boolean
  onSlotClick: (staffId: string | null, date: string, time: string) => void
  onSelect:    (b: Booking) => void
  onPickDay:   (date: string) => void
}) {
  const { lang } = useLang() as { lang: Lang }
  const L = T[lang]

  const cursor = new Date(date + 'T12:00:00')
  const month  = cursor.getMonth()

  /* Six rows always, starting on the Monday before the 1st — a fixed grid
   * does not jump in height as you page through the year. */
  const first = weekStart(isoDate(new Date(cursor.getFullYear(), month, 1)))
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(first); d.setDate(d.getDate() + i); return d
  })

  const today = isoDate(new Date())

  const byDate = new Map<string, Booking[]>()
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const list = byDate.get(b.date)
    if (list) list.push(b); else byDate.set(b.date, [b])
  }

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-navy-700">
        {DAYS[lang].map(d => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map(d => {
          const iso      = isoDate(d)
          const inMonth  = d.getMonth() === month
          const isToday  = iso === today
          const list     = (byDate.get(iso) ?? []).sort((a, b) => a.time.localeCompare(b.time))
          const value    = list.reduce((s, b) => s + b.price, 0)
          const shown    = list.slice(0, MAX_ROWS)
          const rest     = list.length - shown.length

          return (
            <div
              key={iso}
              className={`min-h-[104px] border-b border-l border-navy-800 flex flex-col ${inMonth ? '' : 'opacity-40'}`}
            >
              {/* The date opens the day; the lines open their booking; what
                  is left over books a new time. */}
              <button
                onClick={() => onPickDay(iso)}
                className="flex items-baseline justify-between px-1.5 pt-1.5 pb-1 transition-colors hover:bg-navy-800/50"
              >
                <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-mustard text-navy-950' : 'text-slate-400'
                }`}>
                  {d.getDate()}
                </span>
                {showValue && value > 0 && (
                  <span className="text-[10px] text-green-400/80 font-medium">
                    {value.toLocaleString('sv-SE')} kr
                  </span>
                )}
              </button>

              <div className="px-1.5 space-y-0.5">
                {shown.map(b => {
                  const color = bookingColor(colors, b)
                  /* A colleague's hour: the time is taken, nothing more. */
                  if (b.masked) return (
                    <div key={b.id} className="w-full flex items-center gap-1 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-navy-600" />
                      <span className="text-[10px] truncate text-slate-600">{clockOf(b.time)} {L.busy}</span>
                    </div>
                  )
                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelect(b)}
                      title={`${clockOf(b.time)} ${b.service} · ${b.customerName}`}
                      className="w-full flex items-center gap-1 min-w-0 rounded transition-colors hover:bg-navy-800"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot} ${
                        b.status === 'pending' ? 'ring-1 ring-offset-1 ring-offset-navy-900 ring-white/40' : ''
                      }`} />
                      <span className={`text-[10px] truncate ${
                        b.status === 'completed' || b.status === 'no_show' ? 'text-slate-500' : 'text-slate-300'
                      }`}>
                        {clockOf(b.time)} {b.customerName.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
                {rest > 0 && (
                  <button onClick={() => onPickDay(iso)}
                    className="text-[10px] text-slate-500 pl-2.5 hover:text-white transition-colors">
                    {L.more(rest)}
                  </button>
                )}
              </div>

              <button
                onClick={() => onSlotClick(null, iso, '')}
                className="group flex-1 min-h-[18px] w-full text-left px-1.5 pb-1 pt-0.5 transition-colors hover:bg-mustard/5"
              >
                <span className="text-[10px] text-transparent group-hover:text-mustard/70 transition-colors">
                  {L.add}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
