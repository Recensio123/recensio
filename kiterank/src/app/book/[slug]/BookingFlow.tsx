'use client'
import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Service = {
  id:               string
  name:             string
  description:      string
  duration_minutes: number
  price_sek:        number | null
}

type SlotItem = { time: string; available: boolean }

type Step = 'service' | 'datetime' | 'details' | 'confirm' | 'success'

const STEP_LIST: { key: Step; label: string }[] = [
  { key: 'service',  label: 'Behandling' },
  { key: 'datetime', label: 'Datum & tid' },
  { key: 'details',  label: 'Uppgifter'  },
  { key: 'confirm',  label: 'Bekräfta'   },
]

// ─── Swedish locale helpers ────────────────────────────────────────────────────

const MONTHS_SV   = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December']
const DAYS_SHORT  = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön']
const DAYS_LONG   = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag']

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_SV[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

function formatPrice(sek: number | null): string {
  if (!sek) return ''
  return `${sek.toLocaleString('sv-SE')} kr`
}

// ─── Calendar component ────────────────────────────────────────────────────────

function Calendar({ selected, onChange }: { selected: string | null; onChange: (d: string) => void }) {
  const today = new Date()
  const [yr, setYr] = useState(today.getFullYear())
  const [mo, setMo] = useState(today.getMonth())

  function pad(n: number) { return String(n).padStart(2, '0') }
  function ds(d: number)  { return `${yr}-${pad(mo + 1)}-${pad(d)}` }

  const todayStr     = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const daysInMonth  = new Date(yr, mo + 1, 0).getDate()
  const firstDow     = new Date(yr, mo, 1).getDay() // 0=Sun
  const emptyCells   = firstDow === 0 ? 6 : firstDow - 1 // convert to Mon-first

  const canPrev = yr > today.getFullYear() || mo > today.getMonth()

  function prevMonth() {
    if (mo === 0) { setYr(y => y - 1); setMo(11) } else setMo(m => m - 1)
  }
  function nextMonth() {
    if (mo === 11) { setYr(y => y + 1); setMo(0) } else setMo(m => m + 1)
  }

  return (
    <div style={{ userSelect: 'none' }}>
      {/* Month navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button
          onClick={prevMonth}
          disabled={!canPrev}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: canPrev ? 'pointer' : 'default', color: canPrev ? '#111' : '#ccc', fontSize: '20px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ‹
        </button>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#111' }}>{MONTHS_SV[mo]} {yr}</span>
        <button
          onClick={nextMonth}
          style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#111', fontSize: '20px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ›
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#aaa', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {Array.from({ length: emptyCells }, (_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day      = i + 1
          const dateStr  = ds(day)
          const dow      = new Date(yr, mo, day).getDay()
          const isPast   = dateStr < todayStr
          const isSun    = dow === 0
          const disabled = isPast || isSun
          const isSel    = dateStr === selected
          const isToday  = dateStr === todayStr

          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => onChange(dateStr)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none',
                background: isSel ? '#111' : 'transparent',
                color:      disabled ? '#ccc' : isSel ? '#fff' : '#111',
                fontSize: '14px', cursor: disabled ? 'default' : 'pointer',
                fontWeight: isSel ? 700 : 400,
                outline:    isToday && !isSel ? '2px solid #e5e7eb' : 'none',
                outlineOffset: '-2px',
                transition: 'background 0.1s',
              }}
              onMouseOver={e => { if (!disabled && !isSel) e.currentTarget.style.background = '#f0f0f0' }}
              onMouseOut={e =>  { if (!disabled && !isSel) e.currentTarget.style.background = 'transparent' }}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Closed-Sundays note */}
      <p style={{ fontSize: '12px', color: '#bbb', marginTop: '12px', textAlign: 'center' }}>
        Stängt på söndagar
      </p>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function BookingFlow({ slug, companyName }: { slug: string; companyName: string }) {
  const [step,         setStep]         = useState<Step>('service')
  const [services,     setServices]     = useState<Service[]>([])
  const [slots,        setSlots]        = useState<SlotItem[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [bookingRef,   setBookingRef]   = useState('')

  // Booking values
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null)
  const [selectedTime,    setSelectedTime]    = useState<string | null>(null)
  const [name,            setName]            = useState('')
  const [phone,           setPhone]           = useState('+46 ')
  const [email,           setEmail]           = useState('')
  const [note,            setNote]            = useState('')
  const [smsOptIn,        setSmsOptIn]        = useState(true)

  // Load services on mount
  useEffect(() => {
    fetch(`/api/book/${slug}`)
      .then(r => r.json())
      .then(d => setServices(d.services ?? []))
  }, [slug])

  // Load time slots whenever date or service changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return
    setSlotsLoading(true)
    setSelectedTime(null)
    fetch(`/api/book/${slug}/slots?date=${selectedDate}&duration=${selectedService.duration_minutes}`)
      .then(r => r.json())
      .then(d => { setSlots(d.slots ?? []); setSlotsLoading(false) })
  }, [selectedDate, selectedService, slug])

  async function submit() {
    if (!selectedService || !selectedDate || !selectedTime) return
    setSubmitting(true)
    const res = await fetch(`/api/book/${slug}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:               selectedService.id,
        service_name:             selectedService.name,
        service_duration_minutes: selectedService.duration_minutes,
        service_price_sek:        selectedService.price_sek,
        booking_date:             selectedDate,
        start_time:               selectedTime,
        customer_name:            name,
        customer_phone:           phone,
        customer_email:           email,
        customer_note:            note,
        sms_opt_in:               smsOptIn,
      }),
    })
    const data = await res.json()
    setBookingRef(data.reference ?? '')
    setStep('success')
    setSubmitting(false)
  }

  // Step navigation helpers
  const stepIndex = STEP_LIST.findIndex(s => s.key === step)

  function canNext(): boolean {
    if (step === 'service')  return !!selectedService
    if (step === 'datetime') return !!selectedDate && !!selectedTime
    if (step === 'details')  return name.trim().length > 0 && phone.trim().length > 4
    return true
  }

  function next() {
    const idx = STEP_LIST.findIndex(s => s.key === step)
    if (idx < STEP_LIST.length - 1) setStep(STEP_LIST[idx + 1].key)
  }

  function back() {
    const idx = STEP_LIST.findIndex(s => s.key === step)
    if (idx > 0) setStep(STEP_LIST[idx - 1].key)
  }

  // Shared input style
  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: '10px', fontSize: '15px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', color: '#111',
    background: '#fff', transition: 'border-color 0.15s',
  }

  function focusIn(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#111'
  }
  function focusOut(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = '#e5e7eb'
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '0 16px 100px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '44px 0 28px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: '6px' }}>
            {companyName}
          </p>
          {step !== 'success' && (
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>
              Boka tid
            </h1>
          )}
        </div>

        {/* ── Step progress ────────────────────────────────────────────────── */}
        {step !== 'success' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '28px' }}>
            {STEP_LIST.map((s, i) => {
              const done    = i < stepIndex
              const current = i === stepIndex
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done || current ? '#111' : '#e8e8e8',
                      color:      done || current ? '#fff' : '#aaa',
                      fontSize:   done ? '14px' : '12px', fontWeight: 700,
                      transition: 'all 0.2s',
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{
                      fontSize: '10px', letterSpacing: '0.02em', whiteSpace: 'nowrap',
                      color:    current ? '#111' : '#bbb', fontWeight: current ? 600 : 400,
                    }}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEP_LIST.length - 1 && (
                    <div style={{
                      flex: 1, height: '1.5px', margin: '0 4px', marginBottom: '18px',
                      background: done ? '#111' : '#e5e7eb', transition: 'background 0.2s',
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Content card ─────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: '20px', padding: '28px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' }}>

          {/* Step 1 — Service */}
          {step === 'service' && (
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111', margin: '0 0 18px' }}>
                Välj behandling
              </h2>
              {services.length === 0 ? (
                <div style={{ color: '#bbb', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>
                  Laddar behandlingar…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {services.map(svc => {
                    const sel = selectedService?.id === svc.id
                    return (
                      <button
                        key={svc.id}
                        onClick={() => setSelectedService(svc)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '14px 16px', borderRadius: '12px',
                          border:     sel ? '2px solid #111' : '1.5px solid #ebebeb',
                          background: sel ? '#fafafa' : '#fff',
                          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                          transition: 'all 0.12s',
                        }}
                        onMouseOver={e => { if (!sel) e.currentTarget.style.borderColor = '#ccc' }}
                        onMouseOut={e =>  { if (!sel) e.currentTarget.style.borderColor = '#ebebeb' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: '#111', marginBottom: '3px' }}>
                            {svc.name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#888' }}>
                            {svc.duration_minutes} min
                            {svc.price_sek ? ` · ${formatPrice(svc.price_sek)}` : ''}
                          </div>
                          {svc.description && (
                            <div style={{ fontSize: '12px', color: '#bbb', marginTop: '2px' }}>
                              {svc.description}
                            </div>
                          )}
                        </div>
                        {/* Radio indicator */}
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, marginLeft: '12px',
                          border:     sel ? 'none' : '1.5px solid #ccc',
                          background: sel ? '#111' : 'transparent',
                          display:    'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.12s',
                        }}>
                          {sel && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Date & time (combined) */}
          {step === 'datetime' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111', margin: '0 0 4px' }}>Välj datum & tid</h2>
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  {selectedService?.name} · {selectedService?.duration_minutes} min
                </p>
              </div>

              <Calendar selected={selectedDate} onChange={d => { setSelectedDate(d); setSelectedTime(null) }} />

              {/* Slots appear inline as soon as a date is picked */}
              {selectedDate && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#ebebeb' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>
                      {formatDateLong(selectedDate)}
                    </span>
                    <div style={{ flex: 1, height: '1px', background: '#ebebeb' }} />
                  </div>

                  {slotsLoading ? (
                    <div style={{ color: '#bbb', textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>
                      Laddar tider…
                    </div>
                  ) : slots.filter(s => s.available).length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                      Inga lediga tider — välj ett annat datum.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {slots.map(({ time, available }) => {
                          const sel = selectedTime === time
                          return (
                            <button
                              key={time}
                              disabled={!available}
                              onClick={() => setSelectedTime(time)}
                              style={{
                                padding: '10px 4px', borderRadius: '10px',
                                border:     sel ? '2px solid #111' : '1.5px solid #ebebeb',
                                background: sel ? '#111' : !available ? '#f7f7f7' : '#fff',
                                color:      sel ? '#fff' : !available ? '#ccc' : '#111',
                                fontSize: '14px', fontWeight: sel ? 600 : 400,
                                cursor:   available ? 'pointer' : 'default',
                                fontFamily: 'inherit', transition: 'all 0.1s',
                              }}
                              onMouseOver={e => { if (available && !sel) e.currentTarget.style.borderColor = '#bbb' }}
                              onMouseOut={e =>  { if (available && !sel) e.currentTarget.style.borderColor = '#ebebeb' }}
                            >
                              {time}
                            </button>
                          )
                        })}
                      </div>
                      <p style={{ fontSize: '12px', color: '#ccc', marginTop: '12px', textAlign: 'center' }}>
                        Grå tider är redan bokade
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Details */}
          {step === 'details' && (
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111', margin: '0 0 22px' }}>Dina uppgifter</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Namn <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ditt namn"
                    autoComplete="name"
                    style={inp}
                    onFocus={focusIn}
                    onBlur={focusOut}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Mobilnummer <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+46 70 123 45 67"
                    type="tel"
                    autoComplete="tel"
                    style={inp}
                    onFocus={focusIn}
                    onBlur={focusOut}
                  />
                  <p style={{ fontSize: '12px', color: '#bbb', marginTop: '5px' }}>
                    För SMS-bekräftelse och påminnelse
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    E-post <span style={{ fontSize: '12px', color: '#bbb', fontWeight: 400 }}>(valfritt)</span>
                  </label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="din@email.se"
                    type="email"
                    autoComplete="email"
                    style={inp}
                    onFocus={focusIn}
                    onBlur={focusOut}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                    Meddelande <span style={{ fontSize: '12px', color: '#bbb', fontWeight: 400 }}>(valfritt)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Eventuella önskemål eller information till salongen…"
                    rows={3}
                    style={{ ...inp, resize: 'vertical' }}
                    onFocus={focusIn}
                    onBlur={focusOut}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={e => setSmsOptIn(e.target.checked)}
                    style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#111', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: '#666', lineHeight: 1.55 }}>
                    Jag godkänner att ta emot bokningsbekräftelse och påminnelse via SMS
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Step 5 — Confirm */}
          {step === 'confirm' && selectedService && selectedDate && selectedTime && (
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111', margin: '0 0 20px' }}>
                Bekräfta din bokning
              </h2>
              {/* Booking summary card */}
              <div style={{ border: '1.5px solid #ebebeb', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
                {/* Service + price */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>{selectedService.name}</span>
                    {selectedService.price_sek && (
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#111' }}>{formatPrice(selectedService.price_sek)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {formatDateLong(selectedDate)} · kl. {selectedTime}
                  </div>
                  <div style={{ fontSize: '13px', color: '#aaa', marginTop: '2px' }}>
                    {selectedService.duration_minutes} min
                  </div>
                </div>
                {/* Customer info */}
                <div style={{ padding: '16px 20px', background: '#fafafa' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#111', marginBottom: '3px' }}>{name}</div>
                  <div style={{ fontSize: '14px', color: '#777' }}>{phone}</div>
                  {email && <div style={{ fontSize: '14px', color: '#777' }}>{email}</div>}
                  {note && (
                    <div style={{ fontSize: '13px', color: '#aaa', marginTop: '8px', fontStyle: 'italic' }}>
                      &ldquo;{note}&rdquo;
                    </div>
                  )}
                </div>
              </div>
              {/* Submit */}
              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  width: '100%', padding: '15px', background: submitting ? '#888' : '#111', color: '#fff',
                  border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit',
                  letterSpacing: '-0.01em', transition: 'background 0.15s',
                }}
              >
                {submitting ? 'Bokar…' : 'Bekräfta bokning'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#ccc', marginTop: '12px' }}>
                Kostnadsfri avbokning upp till 24 timmar innan
              </p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0 12px' }}>
              {/* Check circle */}
              <div style={{
                width: '68px', height: '68px', borderRadius: '50%', background: '#111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 22px',
              }}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                  <path d="M7 17l7 7 13-13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#111', letterSpacing: '-0.02em', marginBottom: '8px' }}>
                Bokad!
              </h2>
              <p style={{ color: '#777', fontSize: '15px', lineHeight: 1.6, marginBottom: '22px' }}>
                Din bokning är bekräftad.
                {smsOptIn && (
                  <><br />Vi skickar en SMS-bekräftelse till {phone}.</>
                )}
              </p>
              {bookingRef && (
                <div style={{ display: 'inline-block', background: '#f5f5f3', borderRadius: '8px', padding: '8px 18px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '12px', color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Bokningsnr </span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>#{bookingRef}</span>
                </div>
              )}
              {/* Summary */}
              <div style={{ border: '1.5px solid #ebebeb', borderRadius: '14px', padding: '18px 20px', textAlign: 'left' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '5px' }}>{selectedService?.name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {selectedDate ? formatDateLong(selectedDate) : ''} · kl. {selectedTime}
                </div>
                <div style={{ fontSize: '14px', color: '#aaa', marginTop: '2px' }}>{companyName}</div>
              </div>
              <p style={{ marginTop: '22px', fontSize: '15px', color: '#666' }}>Vi ser fram emot ditt besök! 👋</p>
            </div>
          )}
        </div>

        {/* ── Navigation buttons ───────────────────────────────────────────── */}
        {step !== 'success' && step !== 'confirm' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {stepIndex > 0 && (
              <button
                onClick={back}
                style={{
                  flex: '0 0 auto', padding: '14px 20px', border: '1.5px solid #e5e7eb',
                  borderRadius: '12px', background: '#fff', color: '#555',
                  fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ← Tillbaka
              </button>
            )}
            <button
              onClick={next}
              disabled={!canNext()}
              style={{
                flex: 1, padding: '14px', border: 'none', borderRadius: '12px',
                background: canNext() ? '#111' : '#e8e8e8',
                color:      canNext() ? '#fff' : '#bbb',
                fontSize: '15px', fontWeight: 600,
                cursor:   canNext() ? 'pointer' : 'default', fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              {stepIndex === STEP_LIST.length - 2 ? 'Granska bokning →' : 'Nästa →'}
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <button
            onClick={back}
            style={{
              width: '100%', padding: '14px', border: '1.5px solid #e5e7eb',
              borderRadius: '12px', background: '#fff', color: '#888',
              fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ← Ändra uppgifter
          </button>
        )}
      </div>
    </div>
  )
}
