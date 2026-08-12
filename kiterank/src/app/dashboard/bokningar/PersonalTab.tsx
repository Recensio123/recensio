'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { type StaffMember, type Absence, isExample } from './data'

/*
 * The chairs themselves: who works here, when they work, and when they are
 * away. A member without a schedule of her own follows the salon's opening
 * hours — that is the right default for almost everyone, so the schedule
 * editor only appears when someone actually works different hours.
 */

const WEEKDAYS: { dow: string; sv: string; en: string }[] = [
  { dow: '1', sv: 'Måndag',  en: 'Monday'    },
  { dow: '2', sv: 'Tisdag',  en: 'Tuesday'   },
  { dow: '3', sv: 'Onsdag',  en: 'Wednesday' },
  { dow: '4', sv: 'Torsdag', en: 'Thursday'  },
  { dow: '5', sv: 'Fredag',  en: 'Friday'    },
  { dow: '6', sv: 'Lördag',  en: 'Saturday'  },
  { dow: '0', sv: 'Söndag',  en: 'Sunday'    },
]

const T = {
  sv: {
    intro: 'Personerna kunderna kan boka. Den som inte har ett eget schema följer salongens öppettider.',
    add: '+ Lägg till medarbetare', name: 'Namn', title: 'Titel (t.ex. Frisör)', save: 'Spara', cancel: 'Avbryt',
    followsSalon: 'Följer salongens öppettider', ownSchedule: 'Eget schema', off: 'Ledig',
    editSchedule: 'Schema', absences: 'Frånvaro', addAbsence: '+ Frånvaro', remove: 'Ta bort',
    deactivate: 'Ta bort ur bokningen', deactivateTip: 'Personen försvinner ur bokningsflödet och kalendern — gamla bokningar behåller sitt namn.',
    from: 'Från', to: 'Till', reason: 'Anledning (t.ex. semester)',
    wholeSalon: 'Hela salongen', demoNote: 'Exempelpersonal — ändringar sparas när dina egna medarbetare är inlagda.',
  },
  en: {
    intro: 'The people customers can book. Anyone without a schedule of their own follows the salon\'s opening hours.',
    add: '+ Add staff member', name: 'Name', title: 'Title (e.g. Stylist)', save: 'Save', cancel: 'Cancel',
    followsSalon: 'Follows salon hours', ownSchedule: 'Own schedule', off: 'Off',
    editSchedule: 'Schedule', absences: 'Absence', addAbsence: '+ Absence', remove: 'Remove',
    deactivate: 'Remove from booking', deactivateTip: 'The person disappears from the booking flow and the calendar — past bookings keep their name.',
    from: 'From', to: 'To', reason: 'Reason (e.g. vacation)',
    wholeSalon: 'Whole salon', demoNote: 'Example staff — changes persist once your own members are added.',
  },
}

const inputCls = 'bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-mustard/60 w-full'

export function PersonalTab({ staff, absences, demo, onStaffChange, onAbsencesChange }: {
  staff:    StaffMember[]
  absences: Absence[]
  demo:     boolean
  onStaffChange:    (s: StaffMember[]) => void
  onAbsencesChange: (a: Absence[]) => void
}) {
  const { lang } = useLang()
  const L = T[lang]

  const [adding, setAdding]         = useState(false)
  const [newName, setNewName]       = useState('')
  const [newTitle, setNewTitle]     = useState('')
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)
  const [absenceFor, setAbsenceFor]   = useState<string | null>(null)
  const [absFrom, setAbsFrom]       = useState('')
  const [absTo, setAbsTo]           = useState('')
  const [absReason, setAbsReason]   = useState('')

  async function addStaff() {
    if (!newName.trim()) return
    const member: StaffMember = {
      id: `m-new-${Date.now()}`, name: newName.trim(), title: newTitle.trim() || null,
      image: null, schedule: null, is_active: true,
    }
    if (!demo) {
      const res = await fetch('/api/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: member.name, title: member.title, sort_order: staff.length }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.id) member.id = data.id
    }
    onStaffChange([...staff, member])
    setNewName(''); setNewTitle(''); setAdding(false)
  }

  function patchStaff(id: string, fields: Partial<StaffMember>) {
    onStaffChange(staff.map(s => s.id === id ? { ...s, ...fields } : s))
    if (!demo && !isExample(id)) {
      void fetch('/api/staff', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      })
    }
  }

  function deactivate(id: string) {
    onStaffChange(staff.filter(s => s.id !== id))
    if (!demo && !isExample(id)) {
      void fetch('/api/staff', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    }
  }

  async function addAbsence(staffId: string | null) {
    if (!absFrom || !absTo) return
    const entry: Absence = {
      id: `m-abs-${Date.now()}`, staff_id: staffId,
      date_from: absFrom, date_to: absTo, start_time: null, end_time: null,
      reason: absReason.trim() || null,
    }
    if (!demo) {
      const res = await fetch('/api/staff/absence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, date_from: absFrom, date_to: absTo, reason: entry.reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.id) entry.id = data.id
    }
    onAbsencesChange([...absences, entry])
    setAbsenceFor(null); setAbsFrom(''); setAbsTo(''); setAbsReason('')
  }

  function removeAbsence(id: string) {
    onAbsencesChange(absences.filter(a => a.id !== id))
    if (!demo && !isExample(id)) {
      void fetch('/api/staff/absence', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    }
  }

  function scheduleSummary(m: StaffMember): string {
    if (!m.schedule) return L.followsSalon
    const days = WEEKDAYS.filter(w => m.schedule?.[w.dow]).length
    return `${L.ownSchedule} · ${days} ${lang === 'sv' ? 'dagar/vecka' : 'days/week'}`
  }

  return (
    <div className="max-w-3xl">
      <p className="text-slate-400 text-sm mb-4">{L.intro}</p>
      {demo && <p className="text-purple-300/80 text-xs mb-4">{L.demoNote}</p>}

      <div className="space-y-3">
        {staff.map(m => {
          const memberAbsences = absences.filter(a => a.staff_id === m.id)
          return (
            <div key={m.id} className="bg-navy-900 border border-navy-700 rounded-xl p-4">
              <div className="flex items-center gap-3 flex-wrap">
                {m.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="" className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-navy-700 flex items-center justify-center text-sm font-bold text-slate-300">
                    {m.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold">{m.name}</div>
                  <div className="text-slate-500 text-xs">{m.title ?? ''}{m.title ? ' · ' : ''}{scheduleSummary(m)}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setScheduleFor(scheduleFor === m.id ? null : m.id)}
                    className="px-3 py-1.5 bg-navy-800 border border-navy-600 text-slate-300 hover:text-white rounded-lg text-xs">
                    {L.editSchedule}
                  </button>
                  <button onClick={() => setAbsenceFor(absenceFor === m.id ? null : m.id)}
                    className="px-3 py-1.5 bg-navy-800 border border-navy-600 text-slate-300 hover:text-white rounded-lg text-xs">
                    {L.addAbsence}
                  </button>
                  <button onClick={() => deactivate(m.id)} title={L.deactivateTip}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400/80 hover:text-red-400 rounded-lg text-xs">
                    {L.deactivate}
                  </button>
                </div>
              </div>

              {/* Registered absence */}
              {memberAbsences.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {memberAbsences.map(a => (
                    <span key={a.id} className="inline-flex items-center gap-2 bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
                      {a.date_from === a.date_to ? a.date_from : `${a.date_from} – ${a.date_to}`}
                      {a.reason ? ` · ${a.reason}` : ''}
                      <button onClick={() => removeAbsence(a.id)} className="text-slate-500 hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Schedule editor */}
              {scheduleFor === m.id && (
                <div className="mt-4 border-t border-navy-700 pt-4">
                  <label className="flex items-center gap-2 mb-3 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!m.schedule}
                      onChange={e => patchStaff(m.id, {
                        schedule: e.target.checked ? null : Object.fromEntries(
                          WEEKDAYS.map(w => [w.dow, w.dow === '0' ? null : { start: '09:00', end: '18:00' }])),
                      })}
                      className="accent-yellow-500"
                    />
                    {L.followsSalon}
                  </label>
                  {m.schedule && (
                    <div className="space-y-1.5">
                      {WEEKDAYS.map(w => {
                        const day = m.schedule?.[w.dow] ?? null
                        return (
                          <div key={w.dow} className="flex items-center gap-2 text-sm">
                            <span className="w-20 text-slate-400">{lang === 'sv' ? w.sv : w.en}</span>
                            <input
                              type="checkbox"
                              checked={!!day}
                              onChange={e => patchStaff(m.id, {
                                schedule: { ...m.schedule, [w.dow]: e.target.checked ? { start: '09:00', end: '18:00' } : null },
                              })}
                              className="accent-yellow-500"
                            />
                            {day ? (
                              <>
                                <input type="time" value={day.start}
                                  onChange={e => patchStaff(m.id, { schedule: { ...m.schedule, [w.dow]: { ...day, start: e.target.value } } })}
                                  className="bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white" />
                                <span className="text-slate-600">–</span>
                                <input type="time" value={day.end}
                                  onChange={e => patchStaff(m.id, { schedule: { ...m.schedule, [w.dow]: { ...day, end: e.target.value } } })}
                                  className="bg-navy-800 border border-navy-600 rounded px-2 py-1 text-xs text-white" />
                              </>
                            ) : (
                              <span className="text-slate-600 text-xs">{L.off}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Absence form */}
              {absenceFor === m.id && (
                <div className="mt-4 border-t border-navy-700 pt-4 flex items-end gap-2 flex-wrap">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{L.from}</label>
                    <input type="date" value={absFrom} onChange={e => { setAbsFrom(e.target.value); if (!absTo) setAbsTo(e.target.value) }} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{L.to}</label>
                    <input type="date" value={absTo} onChange={e => setAbsTo(e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs text-slate-500 mb-1">{L.reason}</label>
                    <input value={absReason} onChange={e => setAbsReason(e.target.value)} className={inputCls} />
                  </div>
                  <button onClick={() => addAbsence(m.id)}
                    className="px-4 py-2 bg-mustard text-navy-950 rounded-lg text-sm font-semibold">{L.save}</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add member */}
      {adding ? (
        <div className="mt-4 bg-navy-900 border border-navy-700 rounded-xl p-4 flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-slate-500 mb-1">{L.name}</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} className={inputCls} autoFocus />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-slate-500 mb-1">{L.title}</label>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className={inputCls} />
          </div>
          <button onClick={addStaff} className="px-4 py-2 bg-mustard text-navy-950 rounded-lg text-sm font-semibold">{L.save}</button>
          <button onClick={() => setAdding(false)} className="px-4 py-2 bg-navy-800 text-slate-400 rounded-lg text-sm">{L.cancel}</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="mt-4 px-4 py-2 bg-navy-900 border border-navy-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium">
          {L.add}
        </button>
      )}
    </div>
  )
}
