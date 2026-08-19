'use client'
import { useState } from 'react'
import type { Role } from '@/lib/access'
import { useLang } from '@/components/LanguageProvider'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { ExternalLink } from '@/components/ExternalLink'
import {
  type Booking, type StaffMember, type Absence, type ServiceOption, type Status,
  MOCK_BOOKINGS, MOCK_STAFF, MOCK_ABSENCES, MOCK_SERVICES, isExample,
} from './data'
import { DEFAULT_HOURS, type WeekHours } from './kalender'
import { KalenderTab } from './KalenderTab'
import { ListaTab } from './ListaTab'
import { PersonalTab } from './PersonalTab'
import { NewBookingModal, type NewBooking } from './NewBookingModal'
import { InstallningarTab } from './InstallningarTab'
import { KontonTab } from './KontonTab'
import { SmsTab } from './SmsTab'
import { MeddelandenTab } from './MeddelandenTab'
import { AvbokaDialog } from './AvbokaDialog'

/*
 * The bookings workspace. The calendar is the default view because it is the
 * one a salon lives in — who stands where at two o'clock — while the list is
 * the paper trail and Personal is where the chairs themselves are managed.
 *
 * Example data fills everything until real rows exist, so the page always
 * demonstrates what a working week looks like. The example rows are display
 * only — but everything the salon DOES here (a manual booking, a staff
 * member, a policy) is always written through the APIs, demo or not. What is
 * shown may be an example; what is saved never is.
 */

const TODAY = new Date().toISOString().split('T')[0]

type Tab = 'kalender' | 'lista' | 'personal' | 'sms' | 'meddelanden' | 'installningar' | 'konton'

export type { Role } from '@/lib/access'

/* What each login is here to do. A schema account works the whole book; a
 * stylist works their own and keeps their hours; the salon does everything.
 * The routes enforce the same split — this decides what is worth showing. */
const TABS_BY_ROLE: Record<Role, Tab[]> = {
  admin:  ['kalender', 'lista', 'personal', 'sms', 'meddelanden', 'installningar', 'konton'],
  schema: ['kalender', 'lista', 'personal'],
  staff:  ['kalender', 'lista', 'personal'],
}

const T = {
  sv: {
    title:       'Bokningar',
    subtitle:    'Kalendern, kundlistan och personalens scheman',
    bookingLink: 'Bokningslänk',
    demo:        'Exempeldata — så här ser en fylld vecka ut. Riktiga bokningar tar över så fort de kommer in.',
    tabs:        { kalender: 'Kalender', lista: 'Lista', personal: 'Personal', sms: 'SMS', meddelanden: 'Meddelanden', installningar: 'Inställningar', konton: 'Konton' } as Record<Tab, string>,
    statToday:   'Idag',
    statWeek:    'Denna vecka',
    statValue:   'Värde denna vecka',
    statFill:    'Beläggning',
    subBookings: 'bokningar',
    subValue:    'bokat värde',
    subFill:     (h: number) => h === 1 ? '1 ledig timme kvar' : `${h} lediga timmar kvar`,
    newBooking:  '+ Ny bokning',
    tipStatToday:   'Antal bokningar med dagens datum. Avbokade räknas inte med.',
    tipStatWeek:    'Antal bokningar från idag och sju dagar framåt. Avbokade räknas inte med.',
    tipStatValue:   'Summan av priserna för veckans bokningar, från idag och sju dagar framåt. Avbokade räknas inte med.',
    tipStatFill:    'Hur stor del av veckans bemannade tid som är bokad, från idag och sju dagar framåt. Stängda dagar, lediga medarbetare och frånvaro räknas inte som kapacitet.',
  },
  en: {
    title:       'Bookings',
    subtitle:    'The calendar, the client list and staff schedules',
    bookingLink: 'Booking link',
    demo:        'Example data — this is what a full week looks like. Real bookings take over as soon as they arrive.',
    tabs:        { kalender: 'Calendar', lista: 'List', personal: 'Staff', sms: 'SMS', meddelanden: 'Messages', installningar: 'Settings', konton: 'Accounts' } as Record<Tab, string>,
    statToday:   'Today',
    statWeek:    'This week',
    statValue:   'Value this week',
    statFill:    'Occupancy',
    subBookings: 'bookings',
    subValue:    'booked value',
    subFill:     (h: number) => h === 1 ? '1 free hour left' : `${h} free hours left`,
    newBooking:  '+ New booking',
    tipStatToday:   'Number of bookings dated today. Cancelled bookings are not counted.',
    tipStatWeek:    'Number of bookings from today and seven days ahead. Cancelled bookings are not counted.',
    tipStatValue:   'The total price of this week\'s bookings, from today and seven days ahead. Cancelled bookings are not counted.',
    tipStatFill:    'How much of the staffed week is booked, from today and seven days ahead. Closed days, days off and absence do not count as capacity.',
  },
}

export function BokningarDashboard({
  initialBookings = [],
  initialStaff = [],
  initialAbsences = [],
  services = [],
  salonHours = DEFAULT_HOURS,
  initialCancelHours = 0,
  initialLeadMinutes = 60,
  initialAutoConfirm = true,
  initialConfirmationText = null,
  initialTab = 'kalender',
  companyName = 'Din salong',
  bookingLink = '/book/atelier-hair',
  role = 'admin',
  myStaffId = null,
  ownerEmail = null,
}: {
  initialBookings?: Booking[]
  initialStaff?:    StaffMember[]
  initialAbsences?: Absence[]
  services?:        ServiceOption[]
  /** The salon's opening hours, index 0–6 with 0 = Sunday. */
  salonHours?: WeekHours
  initialCancelHours?: number
  initialLeadMinutes?: number
  initialAutoConfirm?: boolean
  initialConfirmationText?: string | null
  initialTab?:      Tab
  companyName?:     string
  bookingLink?:     string
  role?:            Role
  /** The chair a stylist's login speaks for. */
  myStaffId?:       string | null
  ownerEmail?:      string | null
}) {
  const { lang } = useLang()
  const L = T[lang]

  /*
   * Example mode: nothing real yet, so the whole salon is the example one.
   *
   * Staff counts as real. A salon that has entered its people but taken no
   * bookings yet used to have them replaced by the example trio — which meant
   * an account could not be linked to an actual chair, because the actual
   * chairs were not in the list. The two go together: example bookings sit on
   * example chairs, and real chairs get a real (empty) calendar.
   */
  const demo = initialBookings.length === 0 && initialStaff.length === 0

  const [bookings, setBookings] = useState<Booking[]>(demo ? MOCK_BOOKINGS : initialBookings)
  const [staff,    setStaff]    = useState<StaffMember[]>(demo ? MOCK_STAFF : initialStaff)
  const [absences, setAbsences] = useState<Absence[]>(demo ? MOCK_ABSENCES : initialAbsences)
  const svcList = services.length ? services : MOCK_SERVICES

  const allowed = TABS_BY_ROLE[role]
  const [avbokar, setAvbokar] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>(allowed.includes(initialTab) ? initialTab : 'kalender')
  const avbokarBokning = avbokar ? bookings.find(b => b.id === avbokar) ?? null : null

  /*
   * A stylist gets the whole grid, because "is Sara free on Thursday?" is a
   * question she needs answered at the chair. What she does not get is the
   * detail: colleagues' hours arrive already stripped to "Upptaget" by the
   * page that fetched them, so there is nothing here to hide.
   *
   * Editing stays her own chair, and the routes enforce that independently.
   */
  const isStaff      = role === 'staff'
  const editableId   = isStaff ? myStaffId : null      // null = every chair
  const canManage    = role === 'admin'
  /* Takings are the owner's business — a receptionist runs the book without
   * being handed the week's turnover. */
  const seesRevenue  = role === 'admin'
  const [newBookingAt, setNewBookingAt] = useState<{ staffId: string | null; date: string; time: string } | null>(null)

  /* The confirmation wording lives under SMS, with the reminder and the
   * review request — the three things a customer receives, in one place.
   * The state sits here because the tab unmounts when you leave it. */
  const [confirmText,  setConfirmText]  = useState(initialConfirmationText ?? '')
  const [confirmSaved, setConfirmSaved] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  function changeConfirmation(v: string) {
    setConfirmText(v)
    setConfirmSaved(false)
  }

  async function saveConfirmation(text: string) {
    setConfirmSaved(false)
    setConfirmError('')
    const res = await fetch('/api/booking-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation_text: text }),
    })
    if (res.ok) setConfirmSaved(true)
    else setConfirmError((await res.json().catch(() => ({})))?.error ?? 'Kunde inte spara')
  }

  function updateStatus(id: string, status: Status) {
    /* En avbokning är det enda statusbytet kunden får ett besked om, och därför
       det enda som stannar för ett val: vad ska stå i beskedet, och ska det
       skickas alls. Exempelkalendern hoppar över steget — den skickar ingenting
       till någon. */
    if (status === 'cancelled' && !isExample(id)) {
      setAvbokar(id)
      return
    }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    if (!isExample(id)) {
      void fetch('/api/bookings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
    }
  }

  /* Avbokningen genomförd. `message` null betyder att tiden släpps utan att
     kunden får något mail — de kan redan ha fått beskedet i telefon. */
  function genomförAvbokning(id: string, message: string | null) {
    setAvbokar(null)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' as Status } : b))
    void fetch('/api/bookings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, status: 'cancelled',
        ...(message === null ? { notify: false } : { message }),
      }),
    })
  }

  /* Move a booking to another chair. Example ids are not real staff and must
   * not reach the foreign key — the example calendar moves in the browser
   * only, exactly as its status changes do. */
  function updateBookingStaff(id: string, staffId: string | null) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, staffId } : b))
    if (!isExample(id) && !(staffId && isExample(staffId))) {
      void fetch('/api/bookings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, staff_id: staffId }),
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
      /* The salon placed this one on a specific chair, so it is a choice —
       * not something the system picked and may move back. */
      staffRequested: nb.staffId != null,
      createdAt:    TODAY,
    }
    /* Always written to the database — the example data decides what the page
     * shows, never whether the salon's own work is saved. A booking placed on
     * an example column goes in without a person; the example ids are not
     * real staff and must not reach the foreign key. */
    const res = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: nb.staffId && !isExample(nb.staffId) ? nb.staffId : null,
        service_name: nb.service, duration_minutes: nb.duration,
        price_sek: nb.price, booking_date: nb.date, start_time: nb.time,
        customer_name: nb.customerName, customer_phone: nb.phone, note: nb.note, source: nb.source,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (data?.id) local.id = data.id
    setBookings(prev => [...prev, local])
    setNewBookingAt(null)
  }

  /* The list tab keeps a badge for bookings still awaiting confirmation —
   * an errand to work through, not a headline. The calendar carries the
   * rest of the numbers, scoped to whatever period is on screen. */
  const pendingCount = bookings.filter(b => b.status === 'pending').length

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

      {/* View switcher */}
      <div className="flex flex-wrap gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1 mb-6 w-fit">
        {allowed.map(key => (
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
          salonHours={salonHours}
          editableStaffId={editableId}
          showValue={seesRevenue}
          onSlotClick={(staffId, date, time) => setNewBookingAt({ staffId, date, time })}
          onStatusChange={updateStatus}
          onStaffChange={updateBookingStaff}
        />
      )}
      {tab === 'lista' && (
        <ListaTab bookings={bookings} staff={staff} onStatusChange={updateStatus} />
      )}
      {tab === 'meddelanden' && <MeddelandenTab />}

      {/* Avbokningen stannar här för ett val: vad kunden får läsa, och om de ska
          få något alls. Det är det enda statusbytet som når utanför salongen. */}
      {avbokarBokning && (
        <AvbokaDialog
          booking={avbokarBokning}
          staffName={staff.find(s => s.id === avbokarBokning.staffId)?.name ?? null}
          onClose={() => setAvbokar(null)}
          onDone={msg => genomförAvbokning(avbokarBokning.id, msg)}
        />
      )}
      {tab === 'sms' && (
        <SmsTab
          salonName={companyName}
          confirmationText={confirmText}
          onConfirmationChange={changeConfirmation}
          onConfirmationSave={saveConfirmation}
          confirmationSaved={confirmSaved}
          confirmationError={confirmError}
        />
      )}
      {tab === 'installningar' && (
        <InstallningarTab
          initialCancelHours={initialCancelHours}
          initialLeadMinutes={initialLeadMinutes}
          initialAutoConfirm={initialAutoConfirm}
        />
      )}
      {tab === 'personal' && (
        <PersonalTab
          staff={staff}
          absences={absences}
          demo={demo}
          canManage={canManage}
          editableId={editableId}
          salonLead={initialLeadMinutes}
          salonAutoConfirm={initialAutoConfirm}
          onStaffChange={setStaff}
          onAbsencesChange={setAbsences}
        />
      )}
      {tab === 'konton' && (
        <KontonTab staff={staff} ownerEmail={ownerEmail} />
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
