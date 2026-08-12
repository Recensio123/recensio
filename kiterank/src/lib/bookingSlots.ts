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
export function staffFree(
  staff: StaffRow, startMins: number, duration: number, dow: number,
  salon: Availability, bookings: BookingRow[], blocked: BlockedRow[],
): boolean {
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
}): Slot[] {
  const { salon, dow, duration, staff, staffId, bookings, blocked } = opts
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
      available = !busy && !closedNow
    } else {
      available = pool.some(s => staffFree(s, cur, duration, dow, salon, bookings, blocked))
    }
    slots.push({ time: minsToTime(cur), available })
  }
  return slots
}

/** The member who takes an unassigned booking: first free, in display order. */
export function assignStaff(
  staff: StaffRow[], startTime: string, duration: number, dow: number,
  salon: Availability, bookings: BookingRow[], blocked: BlockedRow[],
): StaffRow | null {
  const start = timeToMins(startTime)
  return staff.find(s => staffFree(s, start, duration, dow, salon, bookings, blocked)) ?? null
}
