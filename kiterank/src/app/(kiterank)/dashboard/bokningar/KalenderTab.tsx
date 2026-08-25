'use client'
import { useState } from 'react'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { type Booking, type StaffMember, type Absence, type Status } from './data'
import { ANY_COLOR, ANY_KEY, colorOf, isoDate, staffColors, weekNumber, weekStart, type WeekHours } from './kalender'
import { KalenderStats } from './KalenderStats'
import { KalenderVecka } from './KalenderVecka'
import { KalenderManad } from './KalenderManad'

/*
 * The calendar, in two depths.
 *
 * The week is where a salon works and plans; the month is where it sees a
 * season and drills back down. The two arrows always step by whatever is on
 * screen, so the control never has to be relabelled.
 *
 * One colour per person, held across both views and spelled out in the
 * legend. Status is drawn on top of the colour rather than instead of it —
 * see kalender.ts.
 */

type View = 'vecka' | 'manad'

const MONTHS: Record<Lang, string[]> = {
  sv: ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
}

const T = {
  sv: {
    today: 'Idag', salon: 'Salongen', week: 'v.',
    views: { vecka: 'Vecka', manad: 'Månad' } as Record<View, string>,
    prev: 'Bakåt', next: 'Framåt',
    confirm: 'Bekräfta', done: 'Avslutad', noShow: 'Uteblev', cancel: 'Avboka', close: 'Stäng',
    statuses: { pending: 'Väntar', confirmed: 'Bekräftad', cancelled: 'Avbokad', completed: 'Avslutad', no_show: 'Uteblev' } as Record<Status, string>,
    clickHint: { vecka: 'Klicka på en ledig yta för att lägga in en bokning', manad: 'Klicka på en dag för att öppna dess vecka' } as Record<View, string>,
    onlyTip:  (n: string) => `Visa bara ${n}s tider. Klicka igen för att visa alla.`,
    allTip:   'Visar alla medarbetare.',
    showAll:  'Visa alla',
    onlyNow:  (n: string) => `Visar bara ${n}`,
    anyName:  'Ingen preferens',
    anyTip:   'Visa bara tider där kunden inte bad om någon särskild person. Klicka igen för att visa alla.',
    askedFor: (n: string) => `Kund bokade ${n}`,
    assigned: (n: string) => `Ingen preferens — tilldelad ${n}`,
    keep: 'Behåll',
    pendingTip: 'Streckad kant betyder att bokningen väntar på din bekräftelse.',
  },
  en: {
    today: 'Today', salon: 'The salon', week: 'w.',
    views: { vecka: 'Week', manad: 'Month' } as Record<View, string>,
    prev: 'Back', next: 'Forward',
    confirm: 'Confirm', done: 'Completed', noShow: 'No-show', cancel: 'Cancel', close: 'Close',
    statuses: { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show' } as Record<Status, string>,
    clickHint: { vecka: 'Click an empty stretch to add a booking', manad: 'Click a day to open its week' } as Record<View, string>,
    onlyTip:  (n: string) => `Show only ${n}'s times. Click again to show everyone.`,
    allTip:   'Showing every staff member.',
    showAll:  'Show all',
    onlyNow:  (n: string) => `Showing only ${n}`,
    anyName:  'No preference',
    anyTip:   'Show only times where the customer did not ask for anyone in particular. Click again to show all.',
    askedFor: (n: string) => `Customer booked ${n}`,
    assigned: (n: string) => `No preference — assigned to ${n}`,
    keep: 'Keep',
    pendingTip: 'A dashed edge means the booking is waiting for your confirmation.',
  },
}

const STATUS_PILL: Record<Status, string> = {
  pending:   'bg-amber-500/20 border-amber-500/50 text-amber-200',
  confirmed: 'bg-green-500/15 border-green-500/40 text-green-300',
  cancelled: 'bg-red-500/10 border-red-500/30 text-red-300/70',
  completed: 'bg-slate-500/15 border-slate-500/30 text-slate-300',
  no_show:   'bg-orange-500/15 border-orange-500/40 text-orange-200',
}

export function KalenderTab({ bookings, staff, absences, salonHours, editableStaffId = null, showValue = true, onSlotClick, onStatusChange, onStaffChange }: {
  bookings: Booking[]
  staff:    StaffMember[]
  absences: Absence[]
  salonHours: WeekHours
  /* When the salon lets a stylist read the whole book, she still works only
   * her own chair. Null means every booking is hers to act on. */
  editableStaffId?: string | null
  /** Takings are the owner's business. */
  showValue?: boolean
  onSlotClick:    (staffId: string | null, date: string, time: string) => void
  onStatusChange: (id: string, status: Status) => void
  /** Move a booking to another chair — the answer to "no preference". */
  onStaffChange:  (id: string, staffId: string | null) => void
}) {
  const { lang } = useLang() as { lang: Lang }
  const L = T[lang]

  /* The week is where a salon plans, so it is what the page opens on. */
  const [view, setView] = useState<View>('vecka')
  const [date, setDate] = useState(isoDate(new Date()))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /* One chair at a time. The legend doubles as the filter — the colour you
   * are looking for is already the thing you would click. */
  const [only, setOnly] = useState<string | null>(null)

  /* Read the open booking out of the list rather than holding a copy, so a
   * status change or a move is reflected in the panel that made it. */
  const selected = bookings.find(b => b.id === selectedId) ?? null

  const colors = staffColors(staff)
  const active = staff.filter(s => s.is_active)
  const today  = isoDate(new Date())

  /*
   * The filter picks one chair, or the bookings nobody claimed. A filtered
   * person who then leaves the calendar would hide everything with no way
   * back, so a staff filter only counts while they are still on staff.
   *
   * "No preference" narrows the bookings but not the chairs — those visits
   * are spread across everyone, so the chairs in the legend stay put.
   */
  const onlyAny    = only === ANY_KEY
  const onlyMember = only && !onlyAny ? active.find(s => s.id === only) ?? null : null
  const shown      = onlyAny    ? bookings.filter(b => !b.staffRequested)
                   : onlyMember ? bookings.filter(b => b.staffId === onlyMember.id)
                   : bookings
  const shownStaff = onlyMember ? [onlyMember] : staff
  const filterName = onlyAny ? L.anyName : onlyMember?.name ?? null

  const d = new Date(date + 'T12:00:00')

  /* The arrows always step by what is on screen. Stepping from the previous
   * value rather than the rendered one, so paging quickly through a month
   * does not drop the clicks that land in the same render. */
  function shift(n: number) {
    setDate(prev => {
      const nd = new Date(prev + 'T12:00:00')
      if (view === 'vecka') nd.setDate(nd.getDate() + n * 7)
      else                  nd.setMonth(nd.getMonth() + n, 1)
      return isoDate(nd)
    })
  }

  /* The span the numbers above the grid are counted over — whatever is on
   * screen, including when you have paged away from this week. */
  function statsRange(): { from: string; days: number; period: string } {
    if (view === 'vecka') {
      return {
        from: isoDate(weekStart(date)), days: 7,
        period: lang === 'sv' ? `under v.${weekNumber(date)}` : `in week ${weekNumber(date)}`,
      }
    }
    const first = new Date(d.getFullYear(), d.getMonth(), 1)
    const days  = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    return {
      from: isoDate(first), days,
      period: lang === 'sv'
        ? `i ${MONTHS.sv[d.getMonth()]} ${d.getFullYear()}`
        : `in ${MONTHS.en[d.getMonth()]} ${d.getFullYear()}`,
    }
  }

  function heading(): string {
    if (view === 'vecka') {
      const s = weekStart(date)
      const e = new Date(s); e.setDate(e.getDate() + 6)
      const sameMonth = s.getMonth() === e.getMonth()
      const left  = sameMonth ? `${s.getDate()}` : `${s.getDate()} ${MONTHS[lang][s.getMonth()]}`
      return `${left}–${e.getDate()} ${MONTHS[lang][e.getMonth()]} · ${L.week}${weekNumber(date)}`
    }
    return `${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`
  }

  /** Is the visible range the one containing today? */
  const onToday = view === 'vecka'
    ? isoDate(weekStart(date)) === isoDate(weekStart(today))
    : d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()

  /* The month drills down into the week that day belongs to. */
  function openWeek(iso: string) {
    setDate(iso)
    setView('vecka')
  }

  /* Someone else's booking is readable but not touchable. */
  const canEditSelected = !editableStaffId || selected?.staffId === editableStaffId

  const selectedStaffName = selected
    ? active.find(s => s.id === selected.staffId)?.name ?? L.salon
    : ''

  return (
    <div>
      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Tooltip text={L.prev}>
            <button onClick={() => shift(-1)} aria-label={L.prev}
              className="w-9 h-9 rounded-lg bg-navy-900 border border-navy-700 text-slate-300 hover:text-white hover:border-navy-500">‹</button>
          </Tooltip>
          <Tooltip text={L.next}>
            <button onClick={() => shift(1)} aria-label={L.next}
              className="w-9 h-9 rounded-lg bg-navy-900 border border-navy-700 text-slate-300 hover:text-white hover:border-navy-500">›</button>
          </Tooltip>
        </div>

        {/* Vägen tillbaka till dagens vecka — och bara då den behövs.
            Står man redan där gör knappen ingenting, och en knapp som inte
            gör något läser som en etikett som inte säger något. Vilken dag
            det är syns ändå: dagens datum är markerat i rutnätet. */}
        {!onToday && (
          <button
            onClick={() => setDate(today)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border bg-navy-900 border-navy-700 text-slate-300 hover:text-white"
          >
            {L.today}
          </button>
        )}

        <span className="text-white font-semibold text-lg">{heading()}</span>

        {/* View switcher */}
        <div className="flex gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1 ml-auto">
          {(['vecka', 'manad'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                view === v ? 'bg-mustard/15 text-mustard' : 'text-slate-400 hover:text-white'
              }`}
            >
              {L.views[v]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Who is which colour, and who to look at ──────────────────────── */}
      <div className="flex items-center gap-x-2 gap-y-2 flex-wrap mb-3">
        {active.length > 0 ? active.map(s => {
          const on = only === s.id
          return (
            <Tooltip key={s.id} text={on ? L.allTip : L.onlyTip(s.name.split(' ')[0])}>
              <button
                onClick={() => setOnly(on ? null : s.id)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border transition-all ${
                  on ? 'bg-navy-700 border-navy-500'
                     : `bg-navy-900 border-navy-700 hover:border-navy-500 ${only ? 'opacity-45' : ''}`
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${colorOf(colors, s.id).dot}`} />
                <span className={`text-xs font-medium ${on ? 'text-white' : 'text-slate-300'}`}>{s.name}</span>
              </button>
            </Tooltip>
          )
        }) : (
          <span className="flex items-center gap-1.5 px-1">
            <span className={`w-3 h-3 rounded-full ${colorOf(colors, null).dot}`} />
            <span className="text-slate-300 text-xs font-medium">{L.salon}</span>
          </span>
        )}

        {/* Bookings nobody claimed are a group of their own — they sit on
            every chair, and they are the ones the salon may still move. */}
        {active.length > 0 && (() => {
          const on = only === ANY_KEY
          return (
            <Tooltip text={on ? L.allTip : L.anyTip}>
              <button
                onClick={() => setOnly(on ? null : ANY_KEY)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border transition-all ${
                  on ? 'bg-navy-700 border-navy-500'
                     : `bg-navy-900 border-navy-700 hover:border-navy-500 ${only ? 'opacity-45' : ''}`
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${ANY_COLOR.dot}`} />
                <span className={`text-xs font-medium ${on ? 'text-white' : 'text-slate-300'}`}>{L.anyName}</span>
              </button>
            </Tooltip>
          )
        })()}

        {filterName && (
          <button onClick={() => setOnly(null)}
            className="px-2.5 py-1 rounded-full bg-mustard/15 border border-mustard/40 text-mustard text-xs font-medium">
            {L.showAll} ×
          </button>
        )}

        <Tooltip text={L.pendingTip}>
          <span className="flex items-center gap-1.5 text-slate-500 text-xs ml-1">
            <span className="w-3 h-3 rounded border border-dashed border-slate-500" />
            {L.statuses.pending}
          </span>
        </Tooltip>
      </div>

      {/* The visible period in numbers, between the people and their grid */}
      <KalenderStats
        {...statsRange()}
        bookings={bookings} staff={staff} absences={absences}
        hours={salonHours} showValue={showValue}
      />

      <p className="text-slate-500 text-xs mb-3">
        {filterName ? `${L.onlyNow(filterName)} · ${L.clickHint[view]}` : L.clickHint[view]}
      </p>

      {view === 'vecka' && (
        <KalenderVecka
          date={date} bookings={shown} staff={shownStaff} absences={absences} colors={colors} salonHours={salonHours}
          showValue={showValue} onSlotClick={onSlotClick} onSelect={b => setSelectedId(b.id)} onPickDay={openWeek}
        />
      )}
      {view === 'manad' && (
        <KalenderManad
          date={date} bookings={shown} colors={colors} showValue={showValue}
          onSlotClick={onSlotClick} onSelect={b => setSelectedId(b.id)} onPickDay={openWeek}
        />
      )}

      {/* ── Booking details ──────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedId(null)}>
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-white font-bold text-lg">{selected.customerName}</h3>
                <p className="text-slate-400 text-sm">{selected.phone}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${STATUS_PILL[selected.status]}`}>
                {L.statuses[selected.status]}
              </span>
            </div>

            <div className="text-sm text-slate-300 space-y-1 mb-5">
              <p>{selected.service}</p>
              <p className="text-slate-500">
                {selected.date} · kl. {selected.time} · {selected.duration} min
                {selected.price ? ` · ${selected.price.toLocaleString('sv-SE')} kr` : ''}
              </p>
              {selected.note && <p className="text-slate-400 italic">&ldquo;{selected.note}&rdquo;</p>}
              {selected.channel && <p className="text-slate-500 text-xs">via {selected.channel}</p>}
            </div>

            {/* Who takes it — and whether that was the customer's call */}
            {active.length > 0 && (
              <div className="mb-5 p-3 rounded-xl bg-navy-800/60 border border-navy-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full ${colorOf(colors, selected.staffId).dot}`} />
                  <span className="text-white text-sm font-semibold">
                    {selected.staffRequested ? L.askedFor(selectedStaffName) : L.assigned(selectedStaffName)}
                  </span>
                </div>
                {/* No paragraph either way. The heading already says whether
                    the name was the customer's choice or ours, and a salon
                    reads that line once — after which the explanation is
                    just something standing between them and the chairs. */}
                {/* Moving a booking is the salon's call, so a stylist
                    reading a colleague's day sees the name without the chips. */}
                {canEditSelected && <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {active.map(s => {
                    const mine = s.id === selected.staffId
                    return (
                      <button
                        key={s.id}
                        onClick={() => onStaffChange(selected.id, s.id)}
                        disabled={mine}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                          mine
                            ? 'bg-navy-700 border-navy-600 text-white cursor-default'
                            : 'bg-navy-900 border-navy-700 text-slate-300 hover:text-white hover:border-navy-500'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${colorOf(colors, s.id).dot}`} />
                        {s.name.split(' ')[0]}
                        {mine && <span className="text-slate-500">· {L.keep}</span>}
                      </button>
                    )
                  })}
                </div>}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {canEditSelected && selected.status === 'pending' && (
                <button onClick={() => { onStatusChange(selected.id, 'confirmed'); setSelectedId(null) }}
                  className="px-3 py-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg text-xs font-semibold">✓ {L.confirm}</button>
              )}
              {canEditSelected && (selected.status === 'pending' || selected.status === 'confirmed') && (
                <>
                  <button onClick={() => { onStatusChange(selected.id, 'completed'); setSelectedId(null) }}
                    className="px-3 py-1.5 bg-slate-500/15 text-slate-400 hover:bg-slate-500/25 rounded-lg text-xs font-semibold">{L.done}</button>
                  <button onClick={() => { onStatusChange(selected.id, 'no_show'); setSelectedId(null) }}
                    className="px-3 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg text-xs font-semibold">{L.noShow}</button>
                  <button onClick={() => { onStatusChange(selected.id, 'cancelled'); setSelectedId(null) }}
                    className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold">{L.cancel}</button>
                </>
              )}
              <button onClick={() => setSelectedId(null)}
                className="px-3 py-1.5 bg-navy-700 text-slate-400 hover:text-white rounded-lg text-xs ml-auto">{L.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
