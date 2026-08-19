'use client'
import { useState } from 'react'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { type Booking, type StaffMember, type Status } from './data'

/* The paper trail: every booking as a row, filterable, with the status
 * actions inline. The calendar answers "vem står var" — this answers
 * "vad hände förra veckan" and "vad väntar på svar". */

const TODAY = new Date().toISOString().split('T')[0]

const STATUS_LABEL: Record<Lang, Record<Status, string>> = {
  sv: { pending: 'Väntar', confirmed: 'Bekräftad', cancelled: 'Avbokad', completed: 'Avslutad', no_show: 'Uteblev' },
  en: { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', no_show: 'No-show' },
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

const T = {
  sv: {
    filterAll: 'Alla', filterToday: 'Idag', filterUpcoming: 'Kommande', filterDone: 'Avslutade',
    empty: 'Inga bokningar att visa', today: 'Idag', timePrefix: 'kl.',
    treatment: 'Behandling', email: 'E-post', message: 'Meddelande', booked: 'Bokad', via: 'via', with: 'hos',
    sourceOnline: 'webbokning', sourcePhone: 'telefon', sourceWalkIn: 'drop-in',
    confirm: '✓ Bekräfta', markDone: 'Avslutad', markNoShow: 'Uteblev', cancel: 'Avboka', restore: 'Återställ', call: '☎ Ring',
    tipOnline: 'Kunden bokade själv via din bokningslänk.',
    tipChannel: 'Kanalen besökaren kom ifrån innan bokningen — det är så du ser vad din marknadsföring ger.',
    statusTip: {
      pending: 'Kunden har bokat men du har inte bekräftat tiden än.', confirmed: 'Du har bekräftat bokningen. Tiden är reserverad för kunden.',
      cancelled: 'Bokningen är inställd. Den räknas inte med i statistiken.', completed: 'Besöket är genomfört.', no_show: 'Kunden dök aldrig upp till sin tid.',
    } as Record<Status, string>,
  },
  en: {
    filterAll: 'All', filterToday: 'Today', filterUpcoming: 'Upcoming', filterDone: 'Done',
    empty: 'No bookings to show', today: 'Today', timePrefix: 'at',
    treatment: 'Treatment', email: 'Email', message: 'Message', booked: 'Booked', via: 'via', with: 'with',
    sourceOnline: 'online booking', sourcePhone: 'phone', sourceWalkIn: 'walk-in',
    confirm: '✓ Confirm', markDone: 'Completed', markNoShow: 'No-show', cancel: 'Cancel', restore: 'Restore', call: '☎ Call',
    tipOnline: 'The customer booked through your booking link.',
    tipChannel: 'The channel the visitor came from before booking — this is how you see what your marketing brings in.',
    statusTip: {
      pending: 'The customer has booked but you have not confirmed the time yet.', confirmed: 'You have confirmed the booking. The time is reserved for the customer.',
      cancelled: 'The booking is cancelled. It is not counted in the statistics.', completed: 'The visit is done.', no_show: 'The customer never showed up for their time.',
    } as Record<Status, string>,
  },
}

export function ListaTab({ bookings, staff, onStatusChange }: {
  bookings: Booking[]
  staff:    StaffMember[]
  onStatusChange: (id: string, status: Status) => void
}) {
  const { lang } = useLang()
  const L = T[lang]
  const statusLabel = STATUS_LABEL[lang]

  const [filter, setFilter]         = useState<Filter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const pendingCount = bookings.filter(b => b.status === 'pending').length
  const staffName = (id: string | null) => staff.find(s => s.id === id)?.name ?? null

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
    <div>
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
              filter === key ? 'bg-mustard/15 text-mustard' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
            {key === 'upcoming' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-navy-950 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <p className="text-4xl mb-4">📅</p>
          <p className="text-sm">{L.empty}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(b => {
            const sc      = STATUS_COLORS[b.status]
            const isOpen  = expandedId === b.id
            const isToday = b.date === TODAY
            const who     = staffName(b.staffId)

            return (
              <div key={b.id} className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden transition-all">
                {/* Main row */}
                <div
                  className="flex items-center gap-4 flex-wrap p-4 cursor-pointer hover:bg-navy-800/50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : b.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center shrink-0">
                    <span className="text-slate-300 text-xs font-bold">{initials(b.customerName)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm whitespace-nowrap">{b.customerName}</span>
                      {b.source === 'online' && (
                        <Tooltip text={L.tipOnline}>
                          <span className="text-xs text-slate-500 bg-navy-700 px-1.5 py-0.5 rounded">online</span>
                        </Tooltip>
                      )}
                      {b.channel && (
                        <Tooltip text={L.tipChannel}>
                          <span className="text-xs text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded">{b.channel}</span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5 whitespace-nowrap">{b.phone}</div>
                  </div>

                  <div className="hidden sm:block text-right min-w-[140px]">
                    <div className="text-slate-200 text-sm">{b.service}</div>
                    <div className="text-slate-500 text-xs">
                      {b.duration} min · {formatPrice(b.price)}{who ? ` · ${L.with} ${who.split(' ')[0]}` : ''}
                    </div>
                  </div>

                  <div className="text-right min-w-[120px]">
                    <div className={`text-sm font-medium ${isToday ? 'text-mustard' : 'text-slate-200'}`}>
                      {isToday ? L.today : formatDate(b.date, lang)}
                    </div>
                    <div className="text-slate-500 text-xs">{L.timePrefix} {b.time}</div>
                  </div>

                  <Tooltip text={L.statusTip[b.status]}>
                    <div className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                      {statusLabel[b.status]}
                    </div>
                  </Tooltip>

                  <span className={`text-slate-500 text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </div>

                {/* Expanded actions */}
                {isOpen && (
                  <div className="border-t border-navy-700 px-4 py-4 bg-navy-800/40">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div className="text-sm space-y-1.5">
                        <div className="sm:hidden text-slate-300">
                          <span className="text-slate-500">{L.treatment}: </span>{b.service} · {b.duration} min · {formatPrice(b.price)}
                        </div>
                        {b.email && (
                          <div className="text-slate-400"><span className="text-slate-500">{L.email}: </span>{b.email}</div>
                        )}
                        {b.note && (
                          <div className="text-slate-400"><span className="text-slate-500">{L.message}: </span><em>&ldquo;{b.note}&rdquo;</em></div>
                        )}
                        <div className="text-slate-500 text-xs">
                          {L.booked} {new Date(b.createdAt).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB')} {L.via} {b.source === 'online' ? L.sourceOnline : b.source === 'phone' ? L.sourcePhone : L.sourceWalkIn}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap shrink-0">
                        {b.status === 'pending' && (
                          <button onClick={() => onStatusChange(b.id, 'confirmed')}
                            className="px-3 py-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/25 rounded-lg text-xs font-semibold transition-colors">
                            {L.confirm}
                          </button>
                        )}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <>
                            <button onClick={() => onStatusChange(b.id, 'completed')}
                              className="px-3 py-1.5 bg-slate-500/15 text-slate-400 hover:bg-slate-500/25 rounded-lg text-xs font-semibold transition-colors">
                              {L.markDone}
                            </button>
                            <button onClick={() => onStatusChange(b.id, 'no_show')}
                              className="px-3 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-lg text-xs font-semibold transition-colors">
                              {L.markNoShow}
                            </button>
                            <button onClick={() => onStatusChange(b.id, 'cancelled')}
                              className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold transition-colors">
                              {L.cancel}
                            </button>
                          </>
                        )}
                        {(b.status === 'cancelled' || b.status === 'no_show') && (
                          <button onClick={() => onStatusChange(b.id, 'pending')}
                            className="px-3 py-1.5 bg-navy-700 text-slate-400 hover:text-white rounded-lg text-xs transition-colors">
                            {L.restore}
                          </button>
                        )}
                        <a href={`tel:${b.phone.replace(/\s/g, '')}`}
                          className="px-3 py-1.5 bg-navy-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-colors">
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
