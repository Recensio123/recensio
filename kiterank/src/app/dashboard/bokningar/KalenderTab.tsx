'use client'
import { useState } from 'react'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { type Booking, type StaffMember, type Absence, type Status } from './data'

/*
 * The day calendar — one column per chair.
 *
 * This is the view a salon actually lives in: who stands where at two
 * o'clock. Bookings are blocks on a time grid, absence is greyed out, and an
 * empty stretch is a click away from a manual booking — the phone rings, you
 * click the gap, done.
 */

const DAY_START = 8 * 60          // 08:00
const DAY_END   = 19 * 60         // 19:00
const PX_PER_MIN = 1.1

const DAYS_SHORT: Record<Lang, string[]> = {
  sv: ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'],
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
}
const MONTHS: Record<Lang, string[]> = {
  sv: ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
}

const T = {
  sv: {
    today: 'Idag', salon: 'Salongen', absence: 'Frånvaro',
    confirm: 'Bekräfta', done: 'Avslutad', noShow: 'Uteblev', cancel: 'Avboka', close: 'Stäng',
    statuses: { pending: 'Väntar', confirmed: 'Bekräftad', cancelled: 'Avbokad', completed: 'Avslutad', no_show: 'Uteblev' } as Record<Status, string>,
    clickHint: 'Klicka på en ledig yta för att lägga in en bokning',
  },
  en: {
    today: 'Today', salon: 'The salon', absence: 'Absence',
    confirm: 'Confirm', done: 'Completed', noShow: 'No-show', cancel: 'Cancel', close: 'Close',
    statuses: { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show' } as Record<Status, string>,
    clickHint: 'Click an empty stretch to add a booking',
  },
}

const STATUS_BLOCK: Record<Status, string> = {
  pending:   'bg-amber-500/20 border-amber-500/50 text-amber-100',
  confirmed: 'bg-green-500/15 border-green-500/40 text-green-100',
  cancelled: 'bg-red-500/10 border-red-500/30 text-red-300/60 line-through',
  completed: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
  no_show:   'bg-orange-500/15 border-orange-500/40 text-orange-200',
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minsToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function KalenderTab({ bookings, staff, absences, onSlotClick, onStatusChange }: {
  bookings: Booking[]
  staff:    StaffMember[]
  absences: Absence[]
  onSlotClick:    (staffId: string | null, date: string, time: string) => void
  onStatusChange: (id: string, status: Status) => void
}) {
  const { lang } = useLang()
  const L = T[lang]

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selected, setSelected] = useState<Booking | null>(null)

  const d   = new Date(date + 'T12:00:00')
  const dow = d.getDay()
  const isToday = date === new Date().toISOString().split('T')[0]

  function shift(n: number) {
    const nd = new Date(date + 'T12:00:00')
    nd.setDate(nd.getDate() + n)
    setDate(nd.toISOString().split('T')[0])
  }

  /* No staff yet → one anonymous column, same as the booking flow treats it */
  const columns: { id: string | null; name: string; title: string | null; image: string | null }[] =
    staff.length > 0
      ? staff.filter(s => s.is_active)
      : [{ id: null, name: L.salon, title: null, image: null }]

  const dayBookings = bookings.filter(b => b.date === date && b.status !== 'cancelled')

  /** The grey stretches: personal schedule edges and registered absence. */
  function blockedRanges(member: { id: string | null }): { from: number; to: number; label: string }[] {
    const out: { from: number; to: number; label: string }[] = []
    const st = staff.find(s => s.id === member.id)
    if (st?.schedule) {
      const win = st.schedule[String(dow)]
      if (!win) {
        out.push({ from: DAY_START, to: DAY_END, label: lang === 'sv' ? 'Ledig' : 'Off' })
      } else {
        if (timeToMins(win.start) > DAY_START) out.push({ from: DAY_START, to: timeToMins(win.start), label: '' })
        if (timeToMins(win.end)   < DAY_END)   out.push({ from: timeToMins(win.end), to: DAY_END, label: '' })
      }
    }
    for (const a of absences) {
      if (a.staff_id && a.staff_id !== member.id) continue
      if (date < a.date_from || date > a.date_to) continue
      out.push({
        from:  a.start_time ? timeToMins(a.start_time) : DAY_START,
        to:    a.end_time   ? timeToMins(a.end_time)   : DAY_END,
        label: a.reason ?? L.absence,
      })
    }
    return out
  }

  const gridHeight = (DAY_END - DAY_START) * PX_PER_MIN
  const hours: number[] = []
  for (let h = DAY_START; h < DAY_END; h += 60) hours.push(h)

  return (
    <div>
      {/* Day navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => shift(-1)} className="w-9 h-9 rounded-lg bg-navy-900 border border-navy-700 text-slate-300 hover:text-white">‹</button>
        <button
          onClick={() => setDate(new Date().toISOString().split('T')[0])}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${isToday ? 'bg-mustard/15 border-mustard/40 text-mustard' : 'bg-navy-900 border-navy-700 text-slate-300 hover:text-white'}`}
        >
          {L.today}
        </button>
        <button onClick={() => shift(1)} className="w-9 h-9 rounded-lg bg-navy-900 border border-navy-700 text-slate-300 hover:text-white">›</button>
        <span className="text-white font-semibold text-lg ml-2">
          {DAYS_SHORT[lang][dow]} {d.getDate()} {MONTHS[lang][d.getMonth()]}
        </span>
      </div>

      <p className="text-slate-500 text-xs mb-3">{L.clickHint}</p>

      {/* The grid */}
      <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Column headers */}
          <div className="flex border-b border-navy-700">
            <div className="w-14 shrink-0" />
            {columns.map(c => (
              <div key={c.id ?? 'salon'} className="flex-1 px-3 py-3 flex items-center gap-2 border-l border-navy-800">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{c.name}</div>
                  {c.title && <div className="text-slate-500 text-xs truncate">{c.title}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="flex">
            {/* Hour gutter */}
            <div className="w-14 shrink-0 relative" style={{ height: gridHeight }}>
              {hours.map(h => (
                <div key={h} className="absolute left-0 w-full text-right pr-2 text-[11px] text-slate-500 -translate-y-1/2"
                  style={{ top: (h - DAY_START) * PX_PER_MIN }}>
                  {minsToTime(h)}
                </div>
              ))}
            </div>

            {columns.map(col => {
              const colBookings = dayBookings.filter(b => (b.staffId ?? null) === col.id
                || (staff.length === 0))
              const blocked = blockedRanges(col)
              return (
                <div key={col.id ?? 'salon'} className="flex-1 relative border-l border-navy-800" style={{ height: gridHeight }}>
                  {/* Hour lines */}
                  {hours.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-navy-800/60"
                      style={{ top: (h - DAY_START) * PX_PER_MIN }} />
                  ))}

                  {/* Clickable half-hour cells under everything */}
                  {Array.from({ length: (DAY_END - DAY_START) / 30 }, (_, i) => {
                    const mins = DAY_START + i * 30
                    return (
                      <button
                        key={mins}
                        onClick={() => onSlotClick(col.id, date, minsToTime(mins))}
                        className="absolute left-0 right-0 hover:bg-mustard/5 transition-colors"
                        style={{ top: (mins - DAY_START) * PX_PER_MIN, height: 30 * PX_PER_MIN }}
                        aria-label={minsToTime(mins)}
                      />
                    )
                  })}

                  {/* Blocked stretches */}
                  {blocked.map((r, i) => (
                    <div key={i}
                      className="absolute left-0.5 right-0.5 rounded bg-navy-800/80 border border-navy-700 flex items-center justify-center pointer-events-none"
                      style={{ top: (r.from - DAY_START) * PX_PER_MIN, height: (r.to - r.from) * PX_PER_MIN }}
                    >
                      {r.label && <span className="text-slate-500 text-xs">{r.label}</span>}
                    </div>
                  ))}

                  {/* Bookings */}
                  {colBookings.map(b => {
                    const top = (timeToMins(b.time) - DAY_START) * PX_PER_MIN
                    const height = Math.max(b.duration * PX_PER_MIN, 26)
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelected(b)}
                        className={`absolute left-1 right-1 rounded-lg border px-2 py-1 text-left overflow-hidden ${STATUS_BLOCK[b.status]}`}
                        style={{ top, height, zIndex: 2 }}
                      >
                        <div className="text-xs font-bold truncate">{b.time} · {b.customerName}</div>
                        {height > 40 && <div className="text-[11px] opacity-80 truncate">{b.service}</div>}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Booking details */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-white font-bold text-lg">{selected.customerName}</h3>
                <p className="text-slate-400 text-sm">{selected.phone}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BLOCK[selected.status]}`}>
                {L.statuses[selected.status]}
              </span>
            </div>
            <div className="text-sm text-slate-300 space-y-1 mb-5">
              <p>{selected.service}</p>
              <p className="text-slate-500">{selected.date} · kl. {selected.time} · {selected.duration} min{selected.price ? ` · ${selected.price.toLocaleString('sv-SE')} kr` : ''}</p>
              {selected.note && <p className="text-slate-400 italic">&ldquo;{selected.note}&rdquo;</p>}
              {selected.channel && <p className="text-slate-500 text-xs">via {selected.channel}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {selected.status === 'pending' && (
                <button onClick={() => { onStatusChange(selected.id, 'confirmed'); setSelected(null) }}
                  className="px-3 py-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg text-xs font-semibold">✓ {L.confirm}</button>
              )}
              {(selected.status === 'pending' || selected.status === 'confirmed') && (
                <>
                  <button onClick={() => { onStatusChange(selected.id, 'completed'); setSelected(null) }}
                    className="px-3 py-1.5 bg-slate-500/15 text-slate-400 hover:bg-slate-500/25 rounded-lg text-xs font-semibold">{L.done}</button>
                  <button onClick={() => { onStatusChange(selected.id, 'no_show'); setSelected(null) }}
                    className="px-3 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg text-xs font-semibold">{L.noShow}</button>
                  <button onClick={() => { onStatusChange(selected.id, 'cancelled'); setSelected(null) }}
                    className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold">{L.cancel}</button>
                </>
              )}
              <button onClick={() => setSelected(null)}
                className="px-3 py-1.5 bg-navy-700 text-slate-400 hover:text-white rounded-lg text-xs ml-auto">{L.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
