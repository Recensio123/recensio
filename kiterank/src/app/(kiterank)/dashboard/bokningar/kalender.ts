import { type Booking, type StaffMember, type Absence, type Status } from './data'

/*
 * The calendar's shared vocabulary — the grid, and who owns which colour.
 *
 * Three views read from this file so a person keeps the same colour whether
 * you are looking at an hour, a week or a month. A colour that shifted
 * between views would be worse than no colour at all: the eye learns the
 * mapping once, and then trusts it.
 *
 * The colour says WHO. Status is drawn on top of it — a dashed edge for a
 * booking still waiting, a struck-through grey for one that was cancelled —
 * so the two questions never compete for the same signal.
 */

export const PX_PER_MIN = 1.1

/** The salon's own week, index 0–6 with 0 = Sunday. */
export type WeekHours = { open: string; close: string; active: boolean }[]

/** Mon–Sat 09–18 — the same default the booking system falls back on. */
export const DEFAULT_HOURS: WeekHours =
  [0, 1, 2, 3, 4, 5, 6].map(d => ({ open: '09:00', close: '18:00', active: d !== 0 }))

/**
 * The hours the grid draws. Reading them from the salon rather than assuming
 * 08–19 keeps the calendar honest — and gives back the empty band above and
 * below the working day, which is the cheapest compaction there is.
 */
export function gridRange(hours: WeekHours): { start: number; end: number } {
  const open = hours.filter(h => h.active)
  if (!open.length) return { start: 9 * 60, end: 18 * 60 }
  const start = Math.floor(Math.min(...open.map(h => timeMins(h.open))) / 60) * 60
  const end   = Math.ceil(Math.max(...open.map(h => timeMins(h.close))) / 60) * 60
  // A grid shorter than six hours has nowhere to put a colour treatment
  return { start, end: Math.max(end, start + 6 * 60) }
}

export type StaffColor = {
  /** The solid chip in the legend and the month view. */
  dot:   string
  /** Background and border for a booking block. */
  block: string
  text:  string
}

/* Eight hues that stay apart on a dark ground, including for the most common
 * form of colour blindness — no red/green pair carries meaning on its own,
 * and every block also carries its name in text. */
const PALETTE: StaffColor[] = [
  { dot: 'bg-sky-400',     block: 'bg-sky-500/20 border-sky-400/50',         text: 'text-sky-50'     },
  { dot: 'bg-violet-400',  block: 'bg-violet-500/20 border-violet-400/50',   text: 'text-violet-50'  },
  { dot: 'bg-amber-400',   block: 'bg-amber-500/20 border-amber-400/50',     text: 'text-amber-50'   },
  { dot: 'bg-emerald-400', block: 'bg-emerald-500/20 border-emerald-400/50', text: 'text-emerald-50' },
  { dot: 'bg-rose-400',    block: 'bg-rose-500/20 border-rose-400/50',       text: 'text-rose-50'    },
  { dot: 'bg-cyan-400',    block: 'bg-cyan-500/20 border-cyan-400/50',       text: 'text-cyan-50'    },
  { dot: 'bg-fuchsia-400', block: 'bg-fuchsia-500/20 border-fuchsia-400/50', text: 'text-fuchsia-50' },
  { dot: 'bg-lime-400',    block: 'bg-lime-500/20 border-lime-400/50',       text: 'text-lime-50'    },
]

/** A salon with no staff yet books one anonymous chair. */
export const SALON_COLOR: StaffColor = {
  dot: 'bg-slate-400', block: 'bg-slate-500/20 border-slate-400/45', text: 'text-slate-50',
}

/**
 * Bookings where the customer asked for nobody in particular. They carry a
 * colour of their own rather than the colour of whoever the system happened
 * to give them, because the question they answer is different: not "whose
 * hour is this" but "which of these hours am I free to move".
 *
 * A neutral tone is the point — it reads as unclaimed. The initials still
 * name the chair currently holding it.
 */
export const ANY_COLOR: StaffColor = {
  dot: 'bg-slate-200', block: 'bg-slate-300/20 border-slate-200/50', text: 'text-slate-50',
}

/** The legend's key for the no-preference group — never a real staff id. */
export const ANY_KEY = '__ingen_preferens__'

/**
 * Who owns which colour. Keyed by staff id, with null for the salon's own
 * chair, so every view can look up a booking's colour from its staffId.
 */
export function staffColors(staff: StaffMember[]): Map<string | null, StaffColor> {
  const map = new Map<string | null, StaffColor>()
  map.set(null, SALON_COLOR)
  staff.filter(s => s.is_active).forEach((s, i) => map.set(s.id, PALETTE[i % PALETTE.length]))
  return map
}

export function colorOf(colors: Map<string | null, StaffColor>, staffId: string | null): StaffColor {
  return colors.get(staffId ?? null) ?? SALON_COLOR
}

/** The colour a booking is drawn in — its chair's, unless nobody claimed it. */
export function bookingColor(
  colors: Map<string | null, StaffColor>,
  b: { staffId: string | null; staffRequested: boolean },
): StaffColor {
  return b.staffRequested ? colorOf(colors, b.staffId) : ANY_COLOR
}

/**
 * A booking block: the person's colour, with the status written over it.
 * Cancelled drops the colour entirely — a struck-out grey row reads as gone
 * at a glance, which is the only thing the salon needs from it.
 */
export function blockClass(status: Status, color: StaffColor): string {
  if (status === 'cancelled') return 'bg-navy-800/90 border-navy-600 text-slate-500 line-through border-dashed'
  const base = `${color.block} ${color.text}`
  if (status === 'pending')   return `${base} border-dashed`
  if (status === 'completed') return `${base} opacity-60`
  if (status === 'no_show')   return `${base} opacity-70`
  return base
}

/** 09:00 → 09.00. Swedish writes the clock with a period. */
export function clockOf(t: string): string {
  return t.slice(0, 5).replace(':', '.')
}

/** JB for Johan Berg — enough to tell three chairs apart in a narrow block. */
export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function timeMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minsTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Monday of the week a date falls in — Swedish weeks start on Monday. */
export function weekStart(date: string): Date {
  const d = new Date(date + 'T12:00:00')
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d
}

export function weekNumber(date: string): number {
  /* ISO week: Thursday decides which year and which week a date belongs to. */
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 864e5))
}

/* ── Occupancy ─────────────────────────────────────────────────────────────
 *
 * How much of the staffed week is actually sold.
 *
 * This is the number a salon runs on, and the only one here that is a
 * diagnosis rather than a count: low means the chairs are there but the
 * customers are not, which is a marketing problem; high means the opposite,
 * and the answer is opening hours or another pair of hands.
 *
 * Staffed time, not opening hours. A day the salon is shut, a chair that is
 * off, a week of holiday — none of it counts as capacity nobody filled.
 */
export function weekOccupancy(opts: {
  /** First day, inclusive. */
  from:     string
  days:     number
  bookings: Booking[]
  staff:    StaffMember[]
  absences: Absence[]
  hours:    WeekHours
}): { pct: number; freeHours: number; openMin: number } {
  const { from, days, bookings, staff, absences, hours } = opts
  const active = staff.filter(s => s.is_active)

  let openMin = 0
  const dates: string[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(from + 'T12:00:00')
    d.setDate(d.getDate() + i)
    const iso = isoDate(d)
    dates.push(iso)

    const dow   = d.getDay()
    const salon = hours[dow]
    if (salon && !salon.active) continue
    const open  = timeMins(salon?.open  ?? '09:00')
    const close = timeMins(salon?.close ?? '18:00')

    /* No staff configured is one anonymous chair — the same assumption the
     * booking flow makes, so the two never disagree about capacity. */
    const chairs: (StaffMember | null)[] = active.length ? active : [null]

    for (const s of chairs) {
      let win: [number, number] = [open, close]
      if (s?.schedule) {
        const day = s.schedule[String(dow)]
        if (!day) continue                       // off that weekday
        win = [timeMins(day.start), timeMins(day.end)]
      }

      let mins = Math.max(0, win[1] - win[0])
      for (const a of absences) {
        if (a.staff_id && a.staff_id !== (s?.id ?? null)) continue
        if (iso < a.date_from || iso > a.date_to) continue
        const gapFrom = a.start_time ? timeMins(a.start_time) : win[0]
        const gapTo   = a.end_time   ? timeMins(a.end_time)   : win[1]
        mins -= Math.max(0, Math.min(win[1], gapTo) - Math.max(win[0], gapFrom))
      }
      openMin += Math.max(0, mins)
    }
  }

  const first = dates[0] ?? from
  const last  = dates[dates.length - 1] ?? from
  const bookedMin = bookings
    .filter(b => b.date >= first && b.date <= last && b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.duration, 0)

  return {
    /* Capped: a booking placed outside the staffed window is the salon's own
     * doing, and 112% would read as a bug rather than as overtime. */
    pct:       openMin ? Math.min(100, Math.round((bookedMin / openMin) * 100)) : 0,
    freeHours: Math.max(0, Math.round((openMin - bookedMin) / 60)),
    openMin,
  }
}
