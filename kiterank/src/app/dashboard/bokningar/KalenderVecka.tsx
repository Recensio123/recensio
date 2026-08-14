'use client'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { type Booking, type StaffMember, type Absence } from './data'
import {
  PX_PER_MIN, blockClass, bookingColor, clockOf, gridRange, initialsOf, isoDate,
  minsTime, timeMins, weekStart, type StaffColor, type WeekHours,
} from './kalender'

/*
 * The week — the day view's grid, seven days wide.
 *
 * Blocks sit where their hour is and stand as tall as the treatment is long,
 * so a glance answers when and how much. What the earlier attempt got wrong
 * was giving every chair a sub-column of its own: that narrowed every block
 * in the week to pay for the few hours that are actually triple-booked.
 * Here a booking keeps the whole width of its day unless it genuinely
 * overlaps another, and the initials say who.
 */

const DAYS: Record<Lang, string[]> = {
  sv: ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

const T = {
  sv: { closed: 'Stängt', off: 'Ledig', any: 'Valfri', busy: 'Upptaget' },
  en: { closed: 'Closed', off: 'Off',   any: 'Any',    busy: 'Busy' },
}

type Placed = { booking: Booking; lane: number; lanes: number }

/**
 * Side by side only where they collide.
 *
 * Bookings are grouped into runs that actually overlap, and the width is
 * split inside a run. A quiet Tuesday keeps full-width blocks even when
 * Thursday at two o'clock has three chairs going at once.
 */
function layoutDay(list: Booking[]): Placed[] {
  const sorted = [...list].sort((a, b) => timeMins(a.time) - timeMins(b.time))
  const out: Placed[] = []
  let run: { booking: Booking; lane: number; end: number }[] = []
  let runEnd = -1

  const flush = () => {
    if (!run.length) return
    const lanes = Math.max(...run.map(r => r.lane)) + 1
    for (const r of run) out.push({ booking: r.booking, lane: r.lane, lanes })
    run = []
  }

  for (const b of sorted) {
    const s = timeMins(b.time)
    const e = s + b.duration
    if (s >= runEnd) { flush(); runEnd = e }
    else runEnd = Math.max(runEnd, e)

    // First lane whose previous booking has already finished
    let lane = 0
    while (run.some(r => r.lane === lane && r.end > s)) lane++
    run.push({ booking: b, lane, end: e })
  }
  flush()
  return out
}

export function KalenderVecka({ date, bookings, staff, absences, colors, salonHours, showValue = true, onSlotClick, onSelect, onPickDay }: {
  date:     string
  bookings: Booking[]
  staff:    StaffMember[]
  absences: Absence[]
  colors:   Map<string | null, StaffColor>
  salonHours: WeekHours
  /** Takings are the owner's business. */
  showValue?: boolean
  onSlotClick: (staffId: string | null, date: string, time: string) => void
  onSelect:    (b: Booking) => void
  onPickDay:   (date: string) => void
}) {
  const { lang } = useLang() as { lang: Lang }
  const L = T[lang]

  const active = staff.filter(s => s.is_active)
  const shortName = new Map<string | null, string>(active.map(s => [s.id, initialsOf(s.name)]))

  const start = weekStart(date)
  const today = isoDate(new Date())

  const { start: DAY_START, end: DAY_END } = gridRange(salonHours)
  const gridHeight = (DAY_END - DAY_START) * PX_PER_MIN
  const hours: number[] = []
  for (let h = DAY_START; h < DAY_END; h += 60) hours.push(h)

  /* Salon shut and everyone-happens-to-be-off are different facts, and a
   * calendar filtered to one person makes the difference matter. */
  function closedLabel(day: string, dow: number): string | null {
    if (salonHours[dow] && !salonHours[dow].active) return L.closed
    if (!active.length) return null
    const allAway = active.every(s => {
      if (s.schedule && !s.schedule[String(dow)]) return true
      return absences.some(a => (!a.staff_id || a.staff_id === s.id)
        && day >= a.date_from && day <= a.date_to && !a.start_time)
    })
    return allAway ? L.off : null
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date(start); d.setDate(d.getDate() + i)
    const iso = isoDate(d)
    const list = bookings.filter(b => b.date === iso && b.status !== 'cancelled')
    return {
      d, iso, i,
      placed: layoutDay(list),
      value:  list.reduce((s, b) => s + b.price, 0),
      closed: closedLabel(iso, d.getDay()),
    }
  })

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-navy-700">
        <div className="w-12 shrink-0" />
        {week.map(({ d, iso, i, value, closed }) => {
          const isToday = iso === today
          return (
            <button
              key={iso}
              onClick={() => onPickDay(iso)}
              className={`flex-1 min-w-0 px-2 py-2 text-left border-l border-navy-800 transition-colors hover:bg-navy-800/60 ${
                isToday ? 'bg-mustard/10' : ''
              } ${closed ? 'opacity-50' : ''}`}
            >
              <div className="flex items-baseline gap-1.5">
                <span className={`text-[11px] font-medium ${isToday ? 'text-mustard' : 'text-slate-500'}`}>
                  {DAYS[lang][i]}
                </span>
                <span className={`text-sm font-bold ${isToday ? 'text-mustard' : 'text-white'}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[10px] text-slate-600 truncate">{closed ?? ''}</span>
                {showValue && value > 0 && (
                  <span className="text-[10px] text-green-400/80 font-medium shrink-0">
                    {value.toLocaleString('sv-SE')} kr
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* The grid */}
      <div className="flex">
        <div className="w-12 shrink-0 relative" style={{ height: gridHeight }}>
          {hours.map(h => (
            <div key={h} className="absolute left-0 w-full text-right pr-1.5 text-[11px] text-slate-500 -translate-y-1/2 tabular-nums"
              style={{ top: (h - DAY_START) * PX_PER_MIN }}>
              {clockOf(minsTime(h))}
            </div>
          ))}
        </div>

        {week.map(({ iso, placed, closed }) => (
          <div key={iso} className={`flex-1 min-w-0 relative border-l border-navy-800 ${closed ? 'bg-navy-800/40' : ''}`}
            style={{ height: gridHeight }}>
            {hours.map(h => (
              <div key={h} className="absolute left-0 right-0 border-t border-navy-800/60"
                style={{ top: (h - DAY_START) * PX_PER_MIN }} />
            ))}

            {/* Half-hour cells under everything — clicking an empty stretch
                opens the booking with that day and time already filled in. */}
            {!closed && Array.from({ length: (DAY_END - DAY_START) / 30 }, (_, k) => {
              const mins = DAY_START + k * 30
              return (
                <button
                  key={mins}
                  onClick={() => onSlotClick(null, iso, minsTime(mins))}
                  className="absolute left-0 right-0 hover:bg-mustard/5 transition-colors"
                  style={{ top: (mins - DAY_START) * PX_PER_MIN, height: 30 * PX_PER_MIN }}
                  aria-label={`${iso} ${minsTime(mins)}`}
                />
              )
            })}

            {closed && (
              <div className="absolute inset-0 flex items-start justify-center pt-6 pointer-events-none">
                <span className="text-slate-600 text-[11px]">{closed}</span>
              </div>
            )}

            {placed.map(({ booking: b, lane, lanes }) => {
              const top    = (timeMins(b.time) - DAY_START) * PX_PER_MIN
              const height = Math.max(b.duration * PX_PER_MIN, 24)
              const who    = shortName.get(b.staffId)
              const place  = {
                top, height, zIndex: 2,
                left:  `calc(${(lane / lanes) * 100}% + 2px)`,
                width: `calc(${100 / lanes}% - 4px)`,
              }

              /* A colleague's hour, seen by a stylist. Nothing behind it to
               * open, so it is not a button. */
              if (b.masked) return (
                <div key={b.id} style={place}
                  className="absolute rounded border border-navy-600 bg-navy-800/90 px-1.5 py-0.5 overflow-hidden">
                  <div className="text-[11px] font-medium text-slate-500 truncate leading-tight">
                    {clockOf(b.time)}
                  </div>
                  {height > 30 && (
                    <div className="text-[10px] text-slate-600 truncate leading-tight">{L.busy}</div>
                  )}
                  {who && (
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-bold tracking-wide text-slate-600">
                      {who}
                    </span>
                  )}
                </div>
              )

              return (
                <button
                  key={b.id}
                  onClick={() => onSelect(b)}
                  title={`${clockOf(b.time)} ${b.customerName} · ${b.service}${b.staffRequested ? '' : ` · ${L.any}`}`}
                  className={`absolute rounded border px-1.5 py-0.5 text-left overflow-hidden ${blockClass(b.status, bookingColor(colors, b))}`}
                  style={place}
                >
                  <div className="text-[11px] font-bold truncate leading-tight">
                    {clockOf(b.time)} · {b.customerName}
                  </div>
                  {height > 38 && (
                    <div className="text-[10px] opacity-80 truncate leading-tight">{b.service}</div>
                  )}
                  {who && (
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-bold tracking-wide opacity-90">
                      {who}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
