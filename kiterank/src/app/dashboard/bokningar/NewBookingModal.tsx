'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { type StaffMember, type ServiceOption, type Source } from './data'

/*
 * The phone rings, someone walks in — the salon books the gap herself.
 * Opened from the calendar with the chair and time already filled in, or
 * from the header button with everything blank.
 */

export type NewBooking = {
  customerName: string
  phone:        string
  service:      string
  duration:     number
  price:        number | null
  date:         string
  time:         string
  staffId:      string | null
  note:         string
  source:       Source
}

const T = {
  sv: {
    title: 'Ny bokning', customer: 'Kundens namn', phone: 'Telefon (valfritt)',
    service: 'Behandling', staffLabel: 'Medarbetare', anyStaff: 'Vem som helst',
    date: 'Datum', time: 'Tid', duration: 'Längd (min)', price: 'Pris (kr)',
    note: 'Anteckning (valfritt)', sourcePhone: 'Telefon', sourceWalkIn: 'Drop-in',
    save: 'Boka in', cancel: 'Avbryt', own: 'Egen behandling…',
  },
  en: {
    title: 'New booking', customer: 'Customer name', phone: 'Phone (optional)',
    service: 'Treatment', staffLabel: 'Staff member', anyStaff: 'Anyone',
    date: 'Date', time: 'Time', duration: 'Length (min)', price: 'Price (kr)',
    note: 'Note (optional)', sourcePhone: 'Phone', sourceWalkIn: 'Walk-in',
    save: 'Book it', cancel: 'Cancel', own: 'Custom treatment…',
  },
}

const inputCls = 'bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-mustard/60 w-full'

export function NewBookingModal({ initial, staff, services, onSave, onClose }: {
  initial:  { staffId: string | null; date: string; time: string }
  staff:    StaffMember[]
  services: ServiceOption[]
  onSave:   (b: NewBooking) => void
  onClose:  () => void
}) {
  const { lang } = useLang()
  const L = T[lang]

  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone]       = useState('')
  const [serviceId, setServiceId] = useState(services[0]?.id ?? 'custom')
  const [customService, setCustomService] = useState('')
  const [duration, setDuration] = useState(services[0]?.duration ?? 30)
  const [price, setPrice]       = useState<string>(String(services[0]?.price ?? ''))
  const [date, setDate]         = useState(initial.date)
  const [time, setTime]         = useState(initial.time)
  const [staffId, setStaffId]   = useState<string>(initial.staffId ?? '')
  const [note, setNote]         = useState('')
  const [source, setSource]     = useState<Source>('phone')

  const isCustom = serviceId === 'custom'
  const serviceName = isCustom ? customService : services.find(s => s.id === serviceId)?.name ?? ''

  function pickService(id: string) {
    setServiceId(id)
    const svc = services.find(s => s.id === id)
    if (svc) { setDuration(svc.duration); setPrice(String(svc.price ?? '')) }
  }

  const valid = customerName.trim().length > 0 && serviceName.trim().length > 0 && date && time

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-5">{L.title}</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{L.customer} *</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} className={inputCls} autoFocus />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{L.phone}</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{L.service} *</label>
            <select value={serviceId} onChange={e => pickService(e.target.value)} className={inputCls}>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} · {s.duration} min{s.price ? ` · ${s.price} kr` : ''}</option>
              ))}
              <option value="custom">{L.own}</option>
            </select>
            {isCustom && (
              <input value={customService} onChange={e => setCustomService(e.target.value)}
                placeholder={L.service} className={`${inputCls} mt-2`} />
            )}
          </div>

          {staff.length > 0 && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">{L.staffLabel}</label>
              <select value={staffId} onChange={e => setStaffId(e.target.value)} className={inputCls}>
                <option value="">{L.anyStaff}</option>
                {staff.filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">{L.date} *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{L.time} *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{L.duration}</label>
              <input type="number" min={5} step={5} value={duration} onChange={e => setDuration(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">{L.price}</label>
              <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">{L.note}</label>
            <input value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
          </div>

          {/* How it came in — phone call or someone at the door */}
          <div className="flex gap-2">
            {([['phone', L.sourcePhone], ['walk_in', L.sourceWalkIn]] as [Source, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setSource(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  source === key ? 'bg-mustard/15 border-mustard/40 text-mustard' : 'bg-navy-800 border-navy-600 text-slate-400 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => valid && onSave({
              customerName: customerName.trim(), phone: phone.trim(), service: serviceName.trim(),
              duration, price: price ? Number(price) : null, date, time,
              staffId: staffId || null, note: note.trim(), source,
            })}
            disabled={!valid}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              valid ? 'bg-mustard text-navy-950 hover:bg-mustard/90' : 'bg-navy-800 text-slate-600 cursor-default'
            }`}
          >
            {L.save}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-navy-800 text-slate-400 hover:text-white rounded-lg text-sm">
            {L.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
