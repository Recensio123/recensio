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
    today: 'Idag', count: 'Bokningar', value: 'Värde', fill: 'Beläggning', noShow: 'Uteblev',
    subCount: 'bokningar', subValue: 'bokat värde',
    subFill: (h: number) => h === 1 ? '1 ledig timme' : `${h} lediga timmar`,
    tipToday: 'Antal bokningar med dagens datum, oavsett vilken period du tittar på. Avbokade räknas inte med.',
    tipCount: (p: string) => `Antal bokningar ${p}. Avbokade räknas inte med.`,
    tipValue: (p: string) => `Summan av priserna för bokningarna ${p}. Avbokade räknas inte med.`,
    tipFill:  (p: string) => `Hur stor del av den bemannade tiden ${p} som är bokad. Stängda dagar, lediga medarbetare och frånvaro räknas inte som kapacitet.`,
    subNoShow: (andel: number, av: number) => `${andel}% av ${av} avgjorda`,
    tipNoShow: (p: string) => `Tider ${p} där kunden inte kom. Räknat mot de tider som hunnit avgöras, alltså genomförda plus uteblivna — kommande bokningar räknas inte in. Över tio procent är värt att åtgärda; en påminnelse dagen innan är det billigaste sättet.`,
  },
  en: {
    today: 'Today', count: 'Bookings', value: 'Value', fill: 'Occupancy', noShow: 'No-shows',
    subCount: 'bookings', subValue: 'booked value',
    subFill: (h: number) => h === 1 ? '1 free hour' : `${h} free hours`,
    tipToday: 'Bookings dated today, whichever period you are looking at. Cancelled ones are not counted.',
    tipCount: (p: string) => `Bookings ${p}. Cancelled ones are not counted.`,
    tipValue: (p: string) => `The total price of the bookings ${p}. Cancelled ones are not counted.`,
    tipFill:  (p: string) => `How much of the staffed time ${p} is booked. Closed days, days off and absence do not count as capacity.`,
    subNoShow: (andel: number, av: number) => `${andel}% of ${av} settled`,
    tipNoShow: (p: string) => `Appointments ${p} where the customer did not turn up. Measured against the times already settled — completed plus no-shows. Above ten percent is worth acting on; a reminder the day before is the cheapest fix.`,
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

  /*
   * Uteblivna besök.
   *
   * Räknat som andel och inte bara som antal. Tre uteblivna säger ingenting
   * utan sitt sammanhang: av tolv bokningar är det ett problem som kostar en
   * fjärdedel av veckan, av hundra är det normalt. Nämnaren är de tider som
   * hunnit avgöras — en bokning på fredag har varken kommit eller uteblivit
   * ännu, och att räkna in den skulle göra siffran bättre ju längre fram man
   * bläddrar.
   */
  const avgjorda = inRange.filter(b => b.status === 'completed' || b.status === 'no_show')
  const uteblev  = avgjorda.filter(b => b.status === 'no_show').length
  const andel    = avgjorda.length ? Math.round((uteblev / avgjorda.length) * 100) : 0

  const tiles = [
    { label: L.today, value: String(todayCount), sub: L.subCount, highlight: false, tip: L.tipToday },
    { label: L.count, value: String(count), sub: L.subCount, highlight: false, tip: L.tipCount(period) },
    ...(showValue
      ? [{ label: L.value, value: `${value.toLocaleString('sv-SE')} kr`, sub: L.subValue, highlight: true, tip: L.tipValue(period) }]
      : []),
    { label: L.fill, value: `${fill.pct}%`, sub: L.subFill(fill.freeHours), highlight: false, tip: L.tipFill(period) },
    /* Visas bara när något faktiskt avgjorts. En nolla i en tom vecka är inte
       ett besked, bara en ruta till att läsa förbi. */
    ...(avgjorda.length
      ? [{
          label: L.noShow,
          value: String(uteblev),
          sub:   L.subNoShow(andel, avgjorda.length),
          highlight: false,
          varning: uteblev > 0 && andel >= 10,
          tip:   L.tipNoShow(period),
        }]
      : []),
  ]

  return (
    <div className={`grid grid-cols-2 gap-4 mb-4 ${tiles.length >= 5 ? 'lg:grid-cols-5' : tiles.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {tiles.map(({ label, value: v, sub, highlight, varning, tip }) => (
        <div key={label} className={`bg-navy-900 border rounded-xl p-4 ${
          highlight ? 'border-green-500/25' : varning ? 'border-orange-500/30' : 'border-navy-700'
        }`}>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">{label}</p>
          <Tooltip text={tip}>
            <p className={`text-2xl font-bold ${
              highlight ? 'text-green-400' : varning ? 'text-orange-400' : 'text-white'
            }`}>{v}</p>
          </Tooltip>
          <p className="text-slate-500 text-xs mt-1">{sub}</p>
        </div>
      ))}
    </div>
  )
}
