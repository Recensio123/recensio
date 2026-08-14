/*
 * Slot arithmetic for the booking system.
 *
 * One place, because three callers need the same answer: the public slots
 * API, the booking POST (which must re-check the slot it is about to take),
 * and the dashboard's manual booking. If these ever disagree, a customer
 * books a time the salon does not have.
 *
 * The model: the salon has opening hours per weekday. Each staff member
 * follows them unless they have a schedule of their own. A slot is free for
 * a member when it fits her working window, none of her bookings overlap it,
 * and no blocked time (hers or the whole salon's) covers it. A salon with no
 * staff configured behaves as one anonymous chair — exactly the behaviour
 * from before staff existed.
 */

export type Availability = {
  open_time:  string
  close_time: string
  slot_duration_minutes: number
  is_active:  boolean
}

export type StaffSchedule = Record<string, { start: string; end: string } | null> | null

export type StaffRow = {
  id:       string
  name:     string
  schedule: StaffSchedule
  /** Own booking notice in minutes. Null = the salon's rule applies. */
  lead_minutes?: number | null
  /** Own approval rule. Null = the salon's rule applies. */
  auto_confirm?: boolean | null
}

export type BookingRow = {
  staff_id:   string | null
  start_time: string
  end_time:   string
}

export type BlockedRow = {
  staff_id:   string | null
  start_time: string | null
  end_time:   string | null
}

/** The hours a salon has until it sets its own: Mon–Sat 09–18, Sundays
 *  closed. Matches what the setup seeding writes, so a salon created before
 *  that seeding existed behaves the same as one created after. */
export function defaultAvailability(dow: number): Availability {
  return { open_time: '09:00', close_time: '18:00', slot_duration_minutes: 30, is_active: dow !== 0 }
}

export function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minsToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

export function addMinutes(time: string, mins: number): string {
  return minsToTime(timeToMins(time) + mins)
}

/* ── The booking notice ────────────────────────────────────────────────────
 *
 * A slot the customer can see but the salon cannot staff is worse than no
 * slot at all, so "too soon" is decided here alongside "already taken".
 * Everything is measured against the salon's own clock, not the server's —
 * a host in UTC must not close the afternoon two hours early.
 */

export const SALON_TZ = 'Europe/Stockholm'

/** Today's date and the time of day where the salon actually stands. */
export function salonNow(at: Date = new Date()): { date: string; mins: number } {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: SALON_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at)
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === t)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    mins: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

/**
 * `nowMins` is the current moment expressed on the requested day's clock, so
 * it goes negative for days in the future: 14:00 today reads as -600 when the
 * question is about tomorrow. That is what lets a notice longer than a day
 * work — a 24-hour rule has to reach across midnight, and a rule measured in
 * minutes-since-this-morning never could.
 */
export type LeadRule = { nowMins: number; salonLead: number }

/** The rule the salon set, unless this person set one of their own. */
export function leadFor(staff: { lead_minutes?: number | null } | null | undefined, salonLead: number): number {
  return staff?.lead_minutes ?? salonLead
}

export function autoConfirmFor(staff: { auto_confirm?: boolean | null } | null | undefined, salonAuto: boolean): boolean {
  return staff?.auto_confirm ?? salonAuto
}

/** Builds the rule for one date — the callers all need the same three lines. */
export function leadRuleFor(date: string, salonLead: number, at: Date = new Date()): LeadRule {
  const now  = salonNow(at)
  /* Noon on both dates, so a daylight-saving shift cannot round the day count
   * to the wrong number. */
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${now.date}T12:00:00Z`)) / 864e5)
  return { nowMins: now.mins - days * 24 * 60, salonLead }
}

export function tooSoon(startMins: number, lead: LeadRule | undefined, staffLead: number): boolean {
  if (!lead) return false
  return startMins < lead.nowMins + staffLead
}

/** The window a member works on a given weekday, in minutes. Null = off. */
function workWindow(staff: StaffRow, dow: number, salon: Availability): [number, number] | null {
  if (staff.schedule) {
    const day = staff.schedule[String(dow)]
    if (!day) return null            // a schedule of her own, and this day is not in it
    return [timeToMins(day.start), timeToMins(day.end)]
  }
  return [timeToMins(salon.open_time), timeToMins(salon.close_time)]
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return bStart < aEnd && bEnd > aStart
}

/** Is [start, start+duration) bookable for this member? */
export function staffFree(opts: {
  staff:     StaffRow
  startMins: number
  duration:  number
  dow:       number
  salon:     Availability
  bookings:  BookingRow[]
  blocked:   BlockedRow[]
  lead?:     LeadRule
}): boolean {
  const { staff, startMins, duration, dow, salon, bookings, blocked, lead } = opts

  if (tooSoon(startMins, lead, leadFor(staff, lead?.salonLead ?? 0))) return false

  const win = workWindow(staff, dow, salon)
  if (!win || startMins < win[0] || startMins + duration > win[1]) return false

  const busy = bookings.some(b => b.staff_id === staff.id
    && overlaps(startMins, startMins + duration, timeToMins(b.start_time), timeToMins(b.end_time)))
  if (busy) return false

  return !blocked.some(bl => {
    if (bl.staff_id && bl.staff_id !== staff.id) return false
    const s = bl.start_time ? timeToMins(bl.start_time) : 0
    const e = bl.end_time   ? timeToMins(bl.end_time)   : 24 * 60
    return overlaps(startMins, startMins + duration, s, e)
  })
}

export type Slot = { time: string; available: boolean }

/**
 * The slot grid for a day. `staffId` narrows to one member; null means any.
 * With no staff configured the salon is treated as a single anonymous chair.
 */
export function slotsForDay(opts: {
  salon:    Availability
  dow:      number
  duration: number
  staff:    StaffRow[]
  staffId:  string | null
  bookings: BookingRow[]
  blocked:  BlockedRow[]
  lead?:    LeadRule
}): Slot[] {
  const { salon, dow, duration, staff, staffId, bookings, blocked, lead } = opts
  if (!salon.is_active) return []

  const open     = timeToMins(salon.open_time)
  const close    = timeToMins(salon.close_time)
  const interval = salon.slot_duration_minutes

  const pool = staffId ? staff.filter(s => s.id === staffId) : staff

  const slots: Slot[] = []
  for (let cur = open; cur + duration <= close; cur += interval) {
    let available: boolean
    if (pool.length === 0) {
      // No staff: one chair, any overlapping booking blocks the slot, and so
      // does a salon-wide blocked time.
      const busy = bookings.some(b =>
        overlaps(cur, cur + duration, timeToMins(b.start_time), timeToMins(b.end_time)))
      const closedNow = blocked.some(bl => {
        if (bl.staff_id) return false
        const s = bl.start_time ? timeToMins(bl.start_time) : 0
        const e = bl.end_time   ? timeToMins(bl.end_time)   : 24 * 60
        return overlaps(cur, cur + duration, s, e)
      })
      available = !busy && !closedNow && !tooSoon(cur, lead, lead?.salonLead ?? 0)
    } else {
      available = pool.some(s => staffFree({ staff: s, startMins: cur, duration, dow, salon, bookings, blocked, lead }))
    }
    slots.push({ time: minsToTime(cur), available })
  }
  return slots
}

/** The member who takes an unassigned booking: first free, in display order. */
export function assignStaff(opts: {
  staff:     StaffRow[]
  startTime: string
  duration:  number
  dow:       number
  salon:     Availability
  bookings:  BookingRow[]
  blocked:   BlockedRow[]
  lead?:     LeadRule
}): StaffRow | null {
  const { staff, startTime, ...rest } = opts
  const startMins = timeToMins(startTime)
  return staff.find(s => staffFree({ staff: s, startMins, ...rest })) ?? null
}
