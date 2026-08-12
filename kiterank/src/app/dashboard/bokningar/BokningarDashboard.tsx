'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { ExternalLink } from '@/components/ExternalLink'
import { Tooltip } from '@/components/Tooltip'
import {
  type Booking, type StaffMember, type Absence, type ServiceOption, type Status,
  MOCK_BOOKINGS, MOCK_STAFF, MOCK_ABSENCES, MOCK_SERVICES, isExample,
} from './data'
import { KalenderTab } from './KalenderTab'
import { ListaTab } from './ListaTab'
import { PersonalTab } from './PersonalTab'
import { NewBookingModal, type NewBooking } from './NewBookingModal'

/*
 * The bookings workspace. The calendar is the default view because it is the
 * one a salon lives in — who stands where at two o'clock — while the list is
 * the paper trail and Personal is where the chairs themselves are managed.
 *
 * Example data fills everything until real rows exist, so the page always
 * demonstrates what a working week looks like. Example rows never touch the
 * database; anything real goes through /api/bookings and /api/staff.
 */

const TODAY = new Date().toISOString().split('T')[0]

type Tab = 'kalender' | 'lista' | 'personal'

const T = {
  sv: {
    title:       'Bokningar',
    subtitle:    'Kalendern, kundlistan och personalens scheman',
    bookingLink: 'Bokningslänk',
    demo:        'Exempeldata — så här ser en fylld vecka ut. Riktiga bokningar tar över så fort de kommer in.',
    tabs:        { kalender: 'Kalender', lista: 'Lista', personal: 'Personal' } as Record<Tab, string>,
    statToday:   'Idag',
    statWeek:    'Denna vecka',
    statValue:   'Värde denna vecka',
    statPending: 'Väntar svar',
    subBookings: 'bokningar',
    subValue:    'bokat värde',
    subPending:  'behöver bekräftas',
    newBooking:  '+ Ny bokning',
    tipStatToday:   'Antal bokningar med dagens datum. Avbokade räknas inte med.',
    tipStatWeek:    'Antal bokningar från idag och sju dagar framåt. Avbokade räknas inte med.',
    tipStatValue:   'Summan av priserna för veckans bokningar, från idag och sju dagar framåt. Avbokade räknas inte med.',
    tipStatPending: 'Nya bokningar som väntar på din bekräftelse. Bekräfta snabbt — det minskar risken för avbokningar.',
  },
  en: {
    title:       'Bookings',
    subtitle:    'The calendar, the client list and staff schedules',
    bookingLink: 'Booking link',
    demo:        'Example data — this is what a full week looks like. Real bookings take over as soon as they arrive.',
    tabs:        { kalender: 'Calendar', lista: 'List', personal: 'Staff' } as Record<Tab, string>,
    statToday:   'Today',
    statWeek:    'This week',
    statValue:   'Value this week',
    statPending: 'Awaiting reply',
    subBookings: 'bookings',
    subValue:    'booked value',
    subPending:  'need confirmation',
    newBooking:  '+ New booking',
    tipStatToday:   'Number of bookings dated today. Cancelled bookings are not counted.',
    tipStatWeek:    'Number of bookings from today and seven days ahead. Cancelled bookings are not counted.',
    tipStatValue:   'The total price of this week\'s bookings, from today and seven days ahead. Cancelled bookings are not counted.',
    tipStatPending: 'New bookings waiting for your confirmation. Confirm quickly — it reduces the risk of cancellations.',
  },
}

export function BokningarDashboard({
  initialBookings = [],
  initialStaff = [],
  initialAbsences = [],
  services = [],
  bookingLink = '/book/atelier-hair',
}: {
  initialBookings?: Booking[]
  initialStaff?:    StaffMember[]
  initialAbsences?: Absence[]
  services?:        ServiceOption[]
  bookingLink?:     string
}) {
  const { lang } = useLang()
  const L = T[lang]

  /* Example mode: nothing real yet, so the whole salon is the example one.
   * Real bookings without real staff would put rows in a calendar with no
   * columns, so the example staff only appear alongside example bookings. */
  const demo = initialBookings.length === 0

  const [bookings, setBookings] = useState<Booking[]>(demo ? MOCK_BOOKINGS : initialBookings)
  const [staff,    setStaff]    = useState<StaffMember[]>(demo ? MOCK_STAFF : initialStaff)
  const [absences, setAbsences] = useState<Absence[]>(demo ? MOCK_ABSENCES : initialAbsences)
  const svcList = services.length ? services : MOCK_SERVICES

  const [tab, setTab] = useState<Tab>('kalender')
  const [newBookingAt, setNewBookingAt] = useState<{ staffId: string | null; date: string; time: string } | null>(null)

  function updateStatus(id: string, status: Status) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (!isExample(id)) {
      void fetch('/api/bookings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
    }
  }

  async function createBooking(nb: NewBooking) {
    const local: Booking = {
      id:           `m${Date.now()}`,
      customerName: nb.customerName,
      phone:        nb.phone,
      email:        '',
      service:      nb.service,
      duration:     nb.duration,
      price:        nb.price ?? 0,
      date:         nb.date,
      time:         nb.time,
      status:       'confirmed',
      note:         nb.note,
      source:       nb.source,
      channel:      null,
      staffId:      nb.staffId,
      createdAt:    TODAY,
    }
    if (!demo) {
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: nb.staffId, service_name: nb.service, duration_minutes: nb.duration,
          price_sek: nb.price, booking_date: nb.date, start_time: nb.time,
          customer_name: nb.customerName, customer_phone: nb.phone, note: nb.note, source: nb.source,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.id) local.id = data.id
    }
    setBookings(prev => [...prev, local])
    setNewBookingAt(null)
  }

  // Stats — the week the salon is standing in
  const weekEnd = new Date(TODAY)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const WEEK_END = weekEnd.toISOString().split('T')[0]

  const todayCount   = bookings.filter(b => b.date === TODAY && b.status !== 'cancelled').length
  const weekCount    = bookings.filter(b => b.date >= TODAY && b.date <= WEEK_END && b.status !== 'cancelled').length
  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const weekValue    = bookings
    .filter(b => b.date >= TODAY && b.date <= WEEK_END && b.status !== 'cancelled')
    .reduce((s, b) => s + b.price, 0)

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{L.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{L.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewBookingAt({ staffId: null, date: TODAY, time: '' })}
            className="px-4 py-2 bg-navy-800 border border-navy-600 text-white rounded-lg text-sm font-semibold hover:border-navy-500 transition-colors"
          >
            {L.newBooking}
          </button>
          <ExternalLink
            href={bookingLink}
            className="flex items-center gap-2 px-4 py-2 bg-mustard text-navy-950 rounded-lg text-sm font-semibold hover:bg-mustard/90 transition-colors"
          >
            <span>↗</span> {L.bookingLink}
          </ExternalLink>
          <HelpButton topic="bokningar" />
        </div>
      </div>

      {demo && (
        <div className="mb-6 px-4 py-3 bg-purple-500/10 border border-purple-500/25 rounded-xl text-purple-300 text-sm">
          {L.demo}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: L.statToday,   value: String(todayCount),                        sub: L.subBookings, highlight: false, tip: L.tipStatToday   },
          { label: L.statWeek,    value: String(weekCount),                         sub: L.subBookings, highlight: false, tip: L.tipStatWeek    },
          { label: L.statValue,   value: `${weekValue.toLocaleString('sv-SE')} kr`, sub: L.subValue,    highlight: true,  tip: L.tipStatValue   },
          { label: L.statPending, value: String(pendingCount),                      sub: L.subPending,  highlight: false, tip: L.tipStatPending },
        ].map(({ label, value, sub, highlight, tip }) => (
          <div key={label} className={`bg-navy-900 border rounded-xl p-5 ${highlight ? 'border-green-500/25' : 'border-navy-700'}`}>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
            <Tooltip text={tip}>
              <p className={`text-3xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
            </Tooltip>
            <p className="text-slate-500 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* View switcher */}
      <div className="flex flex-wrap gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1 mb-6 w-fit">
        {(['kalender', 'lista', 'personal'] as Tab[]).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              tab === key ? 'bg-mustard/15 text-mustard' : 'text-slate-400 hover:text-white'
            }`}
          >
            {L.tabs[key]}
            {key === 'lista' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-navy-950 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'kalender' && (
        <KalenderTab
          bookings={bookings}
          staff={staff}
          absences={absences}
          onSlotClick={(staffId, date, time) => setNewBookingAt({ staffId, date, time })}
          onStatusChange={updateStatus}
        />
      )}
      {tab === 'lista' && (
        <ListaTab bookings={bookings} staff={staff} onStatusChange={updateStatus} />
      )}
      {tab === 'personal' && (
        <PersonalTab
          staff={staff}
          absences={absences}
          demo={demo}
          onStaffChange={setStaff}
          onAbsencesChange={setAbsences}
        />
      )}

      {newBookingAt && (
        <NewBookingModal
          initial={newBookingAt}
          staff={staff}
          services={svcList}
          onSave={createBooking}
          onClose={() => setNewBookingAt(null)}
        />
      )}
    </div>
  )
}
