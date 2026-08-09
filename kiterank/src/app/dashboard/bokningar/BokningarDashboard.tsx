'use client'
import { useState } from 'react'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { ExternalLink } from '@/components/ExternalLink'
import { Tooltip } from '@/components/Tooltip'

type Status = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

type Booking = {
  id:           string
  customerName: string
  phone:        string
  email:        string
  service:      string
  duration:     number
  price:        number
  date:         string    // YYYY-MM-DD
  time:         string    // HH:MM
  status:       Status
  note:         string
  source:       'online' | 'phone' | 'walk_in'
  createdAt:    string
}

const TODAY = new Date().toISOString().split('T')[0]

const STATUS_LABEL: Record<Lang, Record<Status, string>> = {
  sv: {
    pending:   'Väntar',
    confirmed: 'Bekräftad',
    cancelled: 'Avbokad',
    completed: 'Avslutad',
    no_show:   'Uteblev',
  },
  en: {
    pending:   'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    no_show:   'No-show',
  },
}

const STATUS_COLORS: Record<Status, { bg: string; text: string }> = {
  pending:   { bg: 'bg-amber-500/15',  text: 'text-amber-400'  },
  confirmed: { bg: 'bg-green-500/15',  text: 'text-green-400'  },
  cancelled: { bg: 'bg-red-500/15',    text: 'text-red-400'    },
  completed: { bg: 'bg-slate-500/15',  text: 'text-slate-400'  },
  no_show:   { bg: 'bg-orange-500/15', text: 'text-orange-400' },
}

const MONTHS: Record<Lang, string[]> = {
  sv: ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
}
const DAYS: Record<Lang, string[]> = {
  sv: ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'],
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
}

function formatDate(dateStr: string, lang: Lang): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS[lang][d.getDay()]} ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatPrice(sek: number): string {
  return `${sek.toLocaleString('sv-SE')} kr`
}

type Filter = 'all' | 'today' | 'upcoming' | 'done'

// Dashboard copy — sv primary / en secondary via useLang.
const T = {
  sv: {
    title:        'Bokningar',
    subtitle:     'Hantera dina kundbokningar och schemalägg behandlingar',
    bookingLink:  'Bokningslänk',
    statToday:    'Idag',
    statWeek:     'Denna vecka',
    statValue:    'Värde denna vecka',
    statPending:  'Väntar svar',
    subBookings:  'bokningar',
    subValue:     'bokat värde',
    subPending:   'behöver bekräftas',
    filterAll:      'Alla',
    filterToday:    'Idag',
    filterUpcoming: 'Kommande',
    filterDone:     'Avslutade',
    empty:        'Inga bokningar att visa',
    today:        'Idag',
    timePrefix:   'kl.',
    treatment:    'Behandling',
    email:        'E-post',
    message:      'Meddelande',
    booked:       'Bokad',
    via:          'via',
    sourceOnline: 'webbokning',
    sourcePhone:  'telefon',
    sourceWalkIn: 'drop-in',
    confirm:      '✓ Bekräfta',
    markDone:     'Avslutad',
    markNoShow:   'Uteblev',
    cancel:       'Avboka',
    restore:      'Återställ',
    call:         '☎ Ring',
    tipStatToday:   'Antal bokningar med dagens datum. Avbokade räknas inte med.',
    tipStatWeek:    'Antal bokningar från idag och sju dagar framåt. Avbokade räknas inte med.',
    tipStatValue:   'Summan av priserna för veckans bokningar, från idag och sju dagar framåt. Avbokade räknas inte med.',
    tipStatPending: 'Nya bokningar som väntar på din bekräftelse. Bekräfta snabbt — det minskar risken för avbokningar.',
    tipPendingBadge: 'Så många bokningar väntar på din bekräftelse.',
    tipOnline:       'Kunden bokade själv via din bokningslänk.',
    statusTip: {
      pending:   'Kunden har bokat men du har inte bekräftat tiden än.',
      confirmed: 'Du har bekräftat bokningen. Tiden är reserverad för kunden.',
      cancelled: 'Bokningen är inställd. Den räknas inte med i statistiken.',
      completed: 'Besöket är genomfört.',
      no_show:   'Kunden dök aldrig upp till sin tid.',
    } as Record<Status, string>,
  },
  en: {
    title:        'Bookings',
    subtitle:     'Manage your customer bookings and schedule treatments',
    bookingLink:  'Booking link',
    statToday:    'Today',
    statWeek:     'This week',
    statValue:    'Value this week',
    statPending:  'Awaiting reply',
    subBookings:  'bookings',
    subValue:     'booked value',
    subPending:   'need confirmation',
    filterAll:      'All',
    filterToday:    'Today',
    filterUpcoming: 'Upcoming',
    filterDone:     'Done',
    empty:        'No bookings to show',
    today:        'Today',
    timePrefix:   'at',
    treatment:    'Treatment',
    email:        'Email',
    message:      'Message',
    booked:       'Booked',
    via:          'via',
    sourceOnline: 'online booking',
    sourcePhone:  'phone',
    sourceWalkIn: 'walk-in',
    confirm:      '✓ Confirm',
    markDone:     'Completed',
    markNoShow:   'No-show',
    cancel:       'Cancel',
    restore:      'Restore',
    call:         '☎ Call',
    tipStatToday:   'Number of bookings dated today. Cancelled bookings are not counted.',
    tipStatWeek:    'Number of bookings from today and seven days ahead. Cancelled bookings are not counted.',
    tipStatValue:   'The total price of this week\'s bookings, from today and seven days ahead. Cancelled bookings are not counted.',
    tipStatPending: 'New bookings waiting for your confirmation. Confirm quickly — it reduces the risk of cancellations.',
    tipPendingBadge: 'This many bookings are waiting for your confirmation.',
    tipOnline:       'The customer booked through your booking link.',
    statusTip: {
      pending:   'The customer has booked but you have not confirmed the time yet.',
      confirmed: 'You have confirmed the booking. The time is reserved for the customer.',
      cancelled: 'The booking is cancelled. It is not counted in the statistics.',
      completed: 'The visit is done.',
      no_show:   'The customer never showed up for their time.',
    } as Record<Status, string>,
  },
}

// Mock fallback — real bookings come from Supabase; sample data keeps the page
// demoable while the bookings table is empty during development.
const daysFromToday = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const MOCK_BOOKINGS: Booking[] = [
  { id: 'm1', customerName: 'Anna Karlsson',  phone: '070-123 45 67', email: 'anna@example.com',  service: 'Klippning dam',      duration: 45,  price: 650,   date: daysFromToday(0),  time: '10:00', status: 'confirmed', note: '',                        source: 'online',  createdAt: daysFromToday(-6) },
  { id: 'm2', customerName: 'Sara Blom',      phone: '073-234 56 78', email: 'sara@example.com',  service: 'Balayage',           duration: 150, price: 2200,  date: daysFromToday(0),  time: '13:00', status: 'pending',   note: 'Vill bli ljusare i topparna', source: 'online', createdAt: daysFromToday(-2) },
  { id: 'm3', customerName: 'Johan Persson',  phone: '070-345 67 89', email: 'johan@example.com', service: 'Herrklippning',      duration: 30,  price: 450,   date: daysFromToday(1),  time: '09:30', status: 'confirmed', note: '',                        source: 'phone',   createdAt: daysFromToday(-4) },
  { id: 'm4', customerName: 'Lisa Marklund',  phone: '076-456 78 90', email: 'lisa@example.com',  service: 'Keratinbehandling',  duration: 120, price: 2500,  date: daysFromToday(3),  time: '11:00', status: 'pending',   note: '',                        source: 'online',  createdAt: daysFromToday(-1) },
  { id: 'm5', customerName: 'Erik Sandberg',  phone: '070-567 89 01', email: 'erik@example.com',  service: 'Skägg & kontur',     duration: 20,  price: 250,   date: daysFromToday(-2), time: '15:30', status: 'completed', note: '',                        source: 'walk_in', createdAt: daysFromToday(-9) },
  { id: 'm6', customerName: 'Maria Lindqvist',phone: '073-678 90 12', email: 'maria@example.com', service: 'Slingor (helhuvud)', duration: 150, price: 1900,  date: daysFromToday(-4), time: '10:00', status: 'completed', note: '',                        source: 'online',  createdAt: daysFromToday(-12) },
  { id: 'm7', customerName: 'Peter Holm',     phone: '070-789 01 23', email: 'peter@example.com', service: 'Herrklippning',      duration: 30,  price: 450,   date: daysFromToday(-5), time: '16:00', status: 'no_show',   note: '',                        source: 'online',  createdAt: daysFromToday(-11) },
]

export function BokningarDashboard({
  initialBookings = [],
  bookingLink = '/book/atelier-hair',
}: {
  initialBookings?: Booking[]
  bookingLink?: string
}) {
  const { lang } = useLang()
  const L = T[lang]
  const statusLabel = STATUS_LABEL[lang]

  const [bookings, setBookings]       = useState<Booking[]>(initialBookings.length > 0 ? initialBookings : MOCK_BOOKINGS)
  const [filter, setFilter]           = useState<Filter>('all')
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  function updateStatus(id: string, status: Status) {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  const weekEnd = new Date(TODAY)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const WEEK_END = weekEnd.toISOString().split('T')[0]

  const todayCount    = bookings.filter(b => b.date === TODAY && b.status !== 'cancelled').length
  const weekCount     = bookings.filter(b => b.date >= TODAY && b.date <= WEEK_END && b.status !== 'cancelled').length
  const pendingCount  = bookings.filter(b => b.status === 'pending').length
  const weekValue     = bookings
    .filter(b => b.date >= TODAY && b.date <= WEEK_END && b.status !== 'cancelled')
    .reduce((s, b) => s + b.price, 0)

  const filtered = bookings.filter(b => {
    if (filter === 'today')    return b.date === TODAY
    if (filter === 'upcoming') return b.date > TODAY && b.status !== 'cancelled'
    if (filter === 'done')     return b.status === 'completed' || b.status === 'cancelled' || b.status === 'no_show'
    return true
  }).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time)
  })

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{L.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{L.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExternalLink
            href={bookingLink}
            className="flex items-center gap-2 px-4 py-2 bg-mustard text-navy-950 rounded-lg text-sm font-semibold hover:bg-mustard/90 transition-colors"
          >
            <span>↗</span> {L.bookingLink}
          </ExternalLink>
          <HelpButton topic="bokningar" />
        </div>
      </div>

      {/* Stats — bookings and what they're worth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1 mb-6 w-fit">
        {([
          ['all',      L.filterAll],
          ['today',    L.filterToday],
          ['upcoming', L.filterUpcoming],
          ['done',     L.filterDone],
        ] as [Filter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              filter === key
                ? 'bg-mustard/15 text-mustard'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
            {key === 'upcoming' && pendingCount > 0 && (
              <Tooltip text={L.tipPendingBadge}>
                <span className="ml-1.5 bg-amber-500 text-navy-950 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              </Tooltip>
            )}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-4xl mb-4">📅</p>
          <p className="text-sm">{L.empty}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const sc     = STATUS_COLORS[b.status]
            const isOpen = expandedId === b.id
            const isToday = b.date === TODAY

            return (
              <div key={b.id}
                className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden transition-all"
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-4 flex-wrap p-4 cursor-pointer hover:bg-navy-800/50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : b.id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center shrink-0">
                    <span className="text-slate-300 text-xs font-bold">{initials(b.customerName)}</span>
                  </div>

                  {/* Customer + service */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm whitespace-nowrap">{b.customerName}</span>
                      {b.source === 'online' && (
                        <Tooltip text={L.tipOnline}>
                          <span className="text-xs text-slate-500 bg-navy-700 px-1.5 py-0.5 rounded">online</span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5 whitespace-nowrap">{b.phone}</div>
                  </div>

                  {/* Service */}
                  <div className="hidden sm:block text-right min-w-[140px]">
                    <div className="text-slate-200 text-sm">{b.service}</div>
                    <div className="text-slate-500 text-xs">{b.duration} min · {formatPrice(b.price)}</div>
                  </div>

                  {/* Date + time */}
                  <div className="text-right min-w-[120px]">
                    <div className={`text-sm font-medium ${isToday ? 'text-mustard' : 'text-slate-200'}`}>
                      {isToday ? L.today : formatDate(b.date, lang)}
                    </div>
                    <div className="text-slate-500 text-xs">{L.timePrefix} {b.time}</div>
                  </div>

                  {/* Status badge */}
                  <Tooltip text={L.statusTip[b.status]}>
                    <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                      {statusLabel[b.status]}
                    </div>
                  </Tooltip>


                  {/* Chevron */}
                  <span className={`text-slate-500 text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </div>

                {/* Expanded actions */}
                {isOpen && (
                  <div className="border-t border-navy-700 px-4 py-4 bg-navy-800/40">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      {/* Details */}
                      <div className="text-sm space-y-1.5">
                        <div className="sm:hidden text-slate-300">
                          <span className="text-slate-500">{L.treatment}: </span>{b.service} · {b.duration} min · {formatPrice(b.price)}
                        </div>
                        {b.email && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">{L.email}: </span>{b.email}
                          </div>
                        )}
                        {b.note && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">{L.message}: </span>
                            <em>"{b.note}"</em>
                          </div>
                        )}
                        <div className="text-slate-500 text-xs">
                          {L.booked} {new Date(b.createdAt).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB')} {L.via} {b.source === 'online' ? L.sourceOnline : b.source === 'phone' ? L.sourcePhone : L.sourceWalkIn}
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div className="flex gap-2 flex-wrap shrink-0">
                        {b.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(b.id, 'confirmed')}
                            className="px-3 py-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg text-xs font-semibold transition-colors"
                          >
                            {L.confirm}
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <>
                            <button
                              onClick={() => updateStatus(b.id, 'completed')}
                              className="px-3 py-1.5 bg-slate-500/15 text-slate-400 hover:bg-slate-500/25 rounded-lg text-xs font-semibold transition-colors"
                            >
                              {L.markDone}
                            </button>
                            <button
                              onClick={() => updateStatus(b.id, 'no_show')}
                              className="px-3 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg text-xs font-semibold transition-colors"
                            >
                              {L.markNoShow}
                            </button>
                            <button
                              onClick={() => updateStatus(b.id, 'cancelled')}
                              className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold transition-colors"
                            >
                              {L.cancel}
                            </button>
                          </>
                        )}
                        {(b.status === 'cancelled' || b.status === 'no_show') && (
                          <button
                            onClick={() => updateStatus(b.id, 'pending')}
                            className="px-3 py-1.5 bg-navy-700 text-slate-400 hover:text-white rounded-lg text-xs transition-colors"
                          >
                            {L.restore}
                          </button>
                        )}
                        <a
                          href={`tel:${b.phone.replace(/\s/g, '')}`}
                          className="px-3 py-1.5 bg-navy-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          {L.call}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
