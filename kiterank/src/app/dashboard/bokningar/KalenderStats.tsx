'use client'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { type Booking, type StaffMember, type Absence } from './data'
import { isoDate, weekOccupancy, type WeekHours } from './kalender'

/*
 * The visible period, in three numbers.
 *
 * They follow the view rather than standing still: a day open on screen is
 * answered with that day's figures, a week with the week's. Four fixed tiles
 * above the tab menu could only ever describe one period, which meant that
 * paging to next month left the numbers quietly describing this one.
 *
 * Counting "today" and "this week" separately made sense while the row was
 * fixed. Scoped to what is on screen they were the same number twice, so the
 * row is three tiles: how many, what it is worth, how full.
 */

const T = {
  sv: {
    today: 'Idag', count: 'Bokningar', value: 'Värde', fill: 'Beläggning',
    subCount: 'bokningar', subValue: 'bokat värde',
    subFill: (h: number) => h === 1 ? '1 ledig timme' : `${h} lediga timmar`,
    tipToday: 'Antal bokningar med dagens datum, oavsett vilken period du tittar på. Avbokade räknas inte med.',
    tipCount: (p: string) => `Antal bokningar ${p}. Avbokade räknas inte med.`,
    tipValue: (p: string) => `Summan av priserna för bokningarna ${p}. Avbokade räknas inte med.`,
    tipFill:  (p: string) => `Hur stor del av den bemannade tiden ${p} som är bokad. Stängda dagar, lediga medarbetare och frånvaro räknas inte som kapacitet.`,
  },
  en: {
    today: 'Today', count: 'Bookings', value: 'Value', fill: 'Occupancy',
    subCount: 'bookings', subValue: 'booked value',
    subFill: (h: number) => h === 1 ? '1 free hour' : `${h} free hours`,
    tipToday: 'Bookings dated today, whichever period you are looking at. Cancelled ones are not counted.',
    tipCount: (p: string) => `Bookings ${p}. Cancelled ones are not counted.`,
    tipValue: (p: string) => `The total price of the bookings ${p}. Cancelled ones are not counted.`,
    tipFill:  (p: string) => `How much of the staffed time ${p} is booked. Closed days, days off and absence do not count as capacity.`,
  },
}

export function KalenderStats({ from, days, period, bookings, staff, absences, hours, showValue }: {
  /** First day of the visible period, inclusive. */
  from:    string
  days:    number
  /** The period in words, for the tooltips: "under v.33", "i augusti". */
  period:  string
  bookings: Booking[]
  staff:    StaffMember[]
  absences: Absence[]
  hours:    WeekHours
  /** Takings are the owner's business. */
  showValue: boolean
}) {
  const { lang } = useLang() as { lang: Lang }
  const L = T[lang]

  const last = (() => {
    const d = new Date(from + 'T12:00:00')
    d.setDate(d.getDate() + days - 1)
    return isoDate(d)
  })()

  const inRange = bookings.filter(b =>
    b.date >= from && b.date <= last && b.status !== 'cancelled')

  const count = inRange.length
  const value = inRange.reduce((s, b) => s + b.price, 0)
  const fill  = weekOccupancy({ from, days, bookings, staff, absences, hours })

  /* Today stands outside the period. A week or a month on screen still
   * leaves the question "what is happening in the salon right now", and
   * that answer should not depend on where you have paged to. */
  const today = isoDate(new Date())
  const todayCount = bookings.filter(b => b.date === today && b.status !== 'cancelled').length

  const tiles = [
    { label: L.today, value: String(todayCount), sub: L.subCount, highlight: false, tip: L.tipToday },
    { label: L.count, value: String(count), sub: L.subCount, highlight: false, tip: L.tipCount(period) },
    ...(showValue
      ? [{ label: L.value, value: `${value.toLocaleString('sv-SE')} kr`, sub: L.subValue, highlight: true, tip: L.tipValue(period) }]
      : []),
    { label: L.fill, value: `${fill.pct}%`, sub: L.subFill(fill.freeHours), highlight: false, tip: L.tipFill(period) },
  ]

  return (
    <div className={`grid grid-cols-2 gap-4 mb-4 ${showValue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {tiles.map(({ label, value: v, sub, highlight, tip }) => (
        <div key={label} className={`bg-navy-900 border rounded-xl p-4 ${highlight ? 'border-green-500/25' : 'border-navy-700'}`}>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">{label}</p>
          <Tooltip text={tip}>
            <p className={`text-2xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{v}</p>
          </Tooltip>
          <p className="text-slate-500 text-xs mt-1">{sub}</p>
        </div>
      ))}
    </div>
  )
}
