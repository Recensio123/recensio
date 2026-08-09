'use client'
import { useState, useEffect } from 'react'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { HelpButton } from '@/components/dashboard/HelpButton'
import { Tooltip } from '@/components/Tooltip'

/*
 * SMS-utskick — two flows (reminder before, review request after), each
 * dual-channel: SMS primary, email fallback (with subject line + sender name).
 * Save buttons appear only when something actually changed.
 * Every list row — automatic or manual — can get a personalised message.
 * Delivery activates when SMS (46elks) and email (Resend) providers connect.
 *
 * Dashboard copy is bilingual (sv primary / en) via useLang. The message
 * TEMPLATES the customer receives stay Swedish regardless of dashboard language.
 */

type Mode = 'auto' | 'manual'
type TimeUnit = 'h' | 'd'

// One salon per account — the salon name is written straight into the texts,
// so the only placeholders are things that vary per booking.
const PLACEHOLDERS = ['{namn}', '{datum}', '{tid}', '{tjänst}', '{länk}']

const defaultReminder = (salon: string) =>
  `Hej {namn}! En påminnelse om din bokning: {tjänst} hos ${salon}, {datum} kl {tid}. Välkommen!`

const defaultReview = (salon: string) =>
  `Tack för ditt besök hos ${salon}, {namn}! Skulle du vilja lämna en snabb recension på Google? Det betyder mycket för oss: {länk}`

// Email needs a subject line the customer sees before opening — SMS does not
const defaultReminderSubject = (salon: string) => `Påminnelse: din bokning hos ${salon}`
const defaultReviewSubject   = (salon: string) => `Tack för ditt besök hos ${salon}`

// Alphanumeric SMS sender IDs are capped at 11 characters by the SMS standard
const SMS_SENDER_MAX = 11

// Dashboard copy — sv primary / en secondary.
const T = {
  sv: {
    pageTitle: 'SMS-utskick',
    pageIntro: 'Påminnelser inför besök och recensionsförfrågningar efteråt — automatiskt eller när du väljer det',
    modeAuto:   'Automatiskt',
    modeManual: 'Jag väljer själv',
    send:  'Skicka',
    hours: 'timmar',
    days:  'dagar',
    insert: 'Infoga:',
    chars:  'tecken',
    saveTemplate: 'Spara mall',
    save:  'Spara',
    saved: 'Sparat ✓',
    shortenTitle: (n: number) => `Max ${n} tecken — korta ner texten`,
    shortenText:  (n: number) => `Max ${n} tecken — korta ner för att kunna spara.`,
    custom: 'Anpassat',
    viaEmail:      '✉ via e-post',
    viaEmailTitle: 'Mobilnummer saknas — skickas som e-post istället',
    editTitle: (name: string) => `Redigera meddelandet till ${name}`,
    noNumber:      'Nummer saknas',
    noNumberTitle: 'Mobilnummer saknas och e-post som reserv är avstängt',
    includeAgain: 'Ta med igen',
    included:     'Ingår ✓',
    skip:         'Hoppa över',
    skipTitle:    'Skicka inte till den här kunden',
    sent:         'Skickat ✓',
    messageTo: (name: string) => `Meddelande till ${name}`,
    saveFor:   (name: string) => `Spara för ${name}`,
    backToTemplate: 'Återgå till mallen',
    cancel:         'Avbryt',
    providerNote: 'SMS-leverans aktiveras när en SMS-tjänst kopplas. Dina mallar och inställningar sparas redan nu.',
    emailBackup:     'E-post som reserv',
    emailBackupDesc: 'Om kunden saknar mobilnummer skickas meddelandet som e-post istället — gäller både påminnelser och recensionsförfrågningar.',
    senderTitle: 'Avsändarnamn',
    senderDesc:  'Det kunden ser som avsändare när meddelandet kommer fram.',
    smsSenderOverTitle: (n: number) => `SMS-namnet får vara max ${n} tecken`,
    smsSenderHint:      (n: number) => `Max ${n} tecken — en teknisk gräns för SMS.`,
    emailLabel:      'E-post',
    emailSenderHint: 'Visas som avsändare i kundens inkorg.',
    reminderTitle: 'Påminnelse inför besök',
    reminderSub:   'Färre missade tider — kunden får ett SMS innan sin bokning',
    whenSend:    'När ska den skickas?',
    beforeVisit: 'innan besöket',
    afterVisit:  'efter besöket',
    yourTemplate: 'Din mall',
    subjectLabel: 'Ämnesrad — när det skickas som e-post',
    subjectHint:  'Det kunden ser i inkorgen innan mejlet öppnas. SMS har ingen ämnesrad.',
    reminderAutoOn: (lead: string) => `Automatiskt på — alla kommande bokningar får påminnelsen ${lead} innan besöket`,
    excluded: (n: number) => `(${n} undantagen)`,
    reminderManualHead: 'Kommande bokningar — välj vilka som får påminnelse',
    sendReminder:       'Skicka påminnelse',
    reviewTitle: 'Recensionsförfrågan efter besök',
    reviewSub:   'Fler Google-recensioner — kunden får din recensionslänk efter besöket',
    zeroHours:   '0 timmar = skickas direkt när besöket markeras som avslutat.',
    reviewAutoOn: (after: string) => `Automatiskt på — alla avslutade besök får förfrågan ${after}`,
    reviewManualHead: 'Avslutade besök — välj vilka som får förfrågan',
    sendRequest:      'Skicka förfrågan',
    policy: 'Alla kunder får samma förfrågan — ingen filtrering på nöjda och missnöjda. Det håller dig på rätt sida av Googles regler för recensioner.',
    tipModeAuto:     'Alla i listan får meddelandet automatiskt vid den tid du valt. Du kan hoppa över enskilda kunder.',
    tipModeManual:   'Inget skickas automatiskt. Du skickar själv till varje kund med knappen på raden.',
    tipStepperValue: 'Hur långt innan eller efter besöket meddelandet skickas. Ändra med − och +.',
    tipSegments:     'Ett SMS rymmer 160 tecken. Längre text delas upp i flera SMS, och varje del kostar som ett eget SMS.',
    tipEmailBackup:  'På: kunder utan mobilnummer får meddelandet som e-post istället. Av: de får inget alls.',
    tipSmsCounter:   'SMS-avsändaren får vara högst 11 tecken — en teknisk gräns i SMS-standarden.',
  },
  en: {
    pageTitle: 'SMS messages',
    pageIntro: 'Reminders before the visit and review requests afterwards — automatic or when you choose',
    modeAuto:   'Automatic',
    modeManual: 'I choose myself',
    send:  'Send',
    hours: 'hours',
    days:  'days',
    insert: 'Insert:',
    chars:  'characters',
    saveTemplate: 'Save template',
    save:  'Save',
    saved: 'Saved ✓',
    shortenTitle: (n: number) => `Max ${n} characters — shorten the text`,
    shortenText:  (n: number) => `Max ${n} characters — shorten it to be able to save.`,
    custom: 'Customised',
    viaEmail:      '✉ via email',
    viaEmailTitle: 'No mobile number — sent as email instead',
    editTitle: (name: string) => `Edit the message to ${name}`,
    noNumber:      'No number',
    noNumberTitle: 'No mobile number and email as backup is turned off',
    includeAgain: 'Include again',
    included:     'Included ✓',
    skip:         'Skip',
    skipTitle:    'Do not send to this customer',
    sent:         'Sent ✓',
    messageTo: (name: string) => `Message to ${name}`,
    saveFor:   (name: string) => `Save for ${name}`,
    backToTemplate: 'Back to the template',
    cancel:         'Cancel',
    providerNote: 'SMS delivery activates once an SMS service is connected. Your templates and settings are saved already.',
    emailBackup:     'Email as backup',
    emailBackupDesc: 'If the customer has no mobile number the message is sent as email instead — applies to both reminders and review requests.',
    senderTitle: 'Sender name',
    senderDesc:  'What the customer sees as the sender when the message arrives.',
    smsSenderOverTitle: (n: number) => `The SMS name can be at most ${n} characters`,
    smsSenderHint:      (n: number) => `Max ${n} characters — a technical SMS limit.`,
    emailLabel:      'Email',
    emailSenderHint: 'Shown as the sender in the customer\'s inbox.',
    reminderTitle: 'Reminder before the visit',
    reminderSub:   'Fewer missed appointments — the customer gets an SMS before their booking',
    whenSend:    'When should it be sent?',
    beforeVisit: 'before the visit',
    afterVisit:  'after the visit',
    yourTemplate: 'Your template',
    subjectLabel: 'Subject line — when sent as email',
    subjectHint:  'What the customer sees in the inbox before opening the email. SMS has no subject line.',
    reminderAutoOn: (lead: string) => `Automatic on — every upcoming booking gets the reminder ${lead} before the visit`,
    excluded: (n: number) => `(${n} excluded)`,
    reminderManualHead: 'Upcoming bookings — choose who gets the reminder',
    sendReminder:       'Send reminder',
    reviewTitle: 'Review request after the visit',
    reviewSub:   'More Google reviews — the customer gets your review link after the visit',
    zeroHours:   '0 hours = sent right when the visit is marked as completed.',
    reviewAutoOn: (after: string) => `Automatic on — every completed visit gets the request ${after}`,
    reviewManualHead: 'Completed visits — choose who gets the request',
    sendRequest:      'Send request',
    policy: 'Every customer gets the same request — no filtering on happy and unhappy. That keeps you on the right side of Google\'s review rules.',
    tipModeAuto:     'Everyone in the list gets the message automatically at the time you chose. You can skip individual customers.',
    tipModeManual:   'Nothing is sent automatically. You send to each customer yourself with the button on the row.',
    tipStepperValue: 'How long before or after the visit the message is sent. Change with − and +.',
    tipSegments:     'One SMS holds 160 characters. Longer texts are split into several SMS, and each part costs as its own SMS.',
    tipEmailBackup:  'On: customers without a mobile number get the message as email instead. Off: they get nothing.',
    tipSmsCounter:   'The SMS sender name can be at most 11 characters — a technical limit in the SMS standard.',
  },
}

function formatLead(value: number, unit: TimeUnit, lang: Lang): string {
  if (lang === 'sv') {
    if (unit === 'h') return value === 1 ? '1 timme' : `${value} timmar`
    return value === 1 ? '1 dag' : `${value} dagar`
  }
  if (unit === 'h') return value === 1 ? '1 hour' : `${value} hours`
  return value === 1 ? '1 day' : `${value} days`
}

// 0 hours after the visit = straight away
function formatAfter(value: number, unit: TimeUnit, lang: Lang): string {
  if (unit === 'h' && value === 0) return lang === 'sv' ? 'direkt efter besöket' : 'right after the visit'
  return lang === 'sv'
    ? `${formatLead(value, unit, lang)} efter besöket`
    : `${formatLead(value, unit, lang)} after the visit`
}

// Sample bookings — mirrors the bookings table while it's empty in development.
// hasPhone: false demonstrates the email fallback for customers without a mobile number.
type Row = {
  id: string; name: string; service: string; when: string
  dateLabel: string; timeLabel: string; hasPhone: boolean
}

const UPCOMING: Row[] = [
  { id: 'u1', name: 'Anna Karlsson', service: 'Klippning dam', when: 'Idag kl 10:00',    dateLabel: 'idag',    timeLabel: '10:00', hasPhone: true  },
  { id: 'u2', name: 'Sara Blom',     service: 'Balayage',      when: 'Idag kl 13:00',    dateLabel: 'idag',    timeLabel: '13:00', hasPhone: true  },
  { id: 'u3', name: 'Johan Persson', service: 'Herrklippning', when: 'Imorgon kl 09:30', dateLabel: 'imorgon', timeLabel: '09:30', hasPhone: false },
]

const COMPLETED: Row[] = [
  { id: 'c1', name: 'Erik Sandberg',   service: 'Skägg & kontur',     when: 'I förrgår',     dateLabel: '', timeLabel: '', hasPhone: true  },
  { id: 'c2', name: 'Maria Lindqvist', service: 'Slingor (helhuvud)', when: '4 dagar sedan', dateLabel: '', timeLabel: '', hasPhone: false },
]

function smsSegments(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(text.length / 160)
}

// Fill the template with this customer's details — the starting point for a
// personalised message. {länk} stays; the review link is inserted at send time.
function personalize(template: string, row: Row): string {
  return template
    .replaceAll('{namn}', row.name.split(' ')[0])
    .replaceAll('{tjänst}', row.service.toLowerCase())
    .replaceAll('{datum}', row.dateLabel || row.when)
    .replaceAll('{tid}', row.timeLabel)
    .replace(/\s+kl\s*[.!,]/g, m => m.replace(/\s+kl\s*/, '')) // tidy if {tid} was empty
}

/* ── Shared pieces ─────────────────────────────────────────────────────────── */

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { lang } = useLang()
  const L = T[lang]
  return (
    <div className="flex gap-1 bg-navy-900 p-1 rounded-lg w-fit">
      {([['auto', L.modeAuto], ['manual', L.modeManual]] as [Mode, string][]).map(([id, label]) => (
        <Tooltip key={id} text={id === 'auto' ? L.tipModeAuto : L.tipModeManual}>
          <button
            onClick={() => onChange(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === id ? 'bg-mustard text-navy-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}

// "Skicka [− n +] [timmar|dagar] innan/efter besöket" — one sentence, freely set.
// minValue 0 (hours) means "direkt efter" for the after-visit flow.
function LeadStepper({
  value, unit, onChange, suffix, minValue = 1,
}: {
  value: number
  unit: TimeUnit
  onChange: (value: number, unit: TimeUnit) => void
  suffix: string
  minValue?: number
}) {
  const { lang } = useLang()
  const L = T[lang]
  const max = unit === 'h' ? 23 : 14
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-slate-300 text-sm">{L.send}</span>
      <div className="flex items-center bg-navy-900 border border-navy-600 rounded-lg overflow-hidden">
        <button
          onClick={() => onChange(Math.max(unit === 'h' ? minValue : 1, value - 1), unit)}
          className="px-3 py-2 text-slate-400 hover:text-white hover:bg-navy-700 transition-colors text-sm font-bold"
        >
          −
        </button>
        <Tooltip text={L.tipStepperValue}>
          <span className="w-10 text-center text-white text-sm font-semibold tabular-nums">{value}</span>
        </Tooltip>
        <button
          onClick={() => onChange(Math.min(max, value + 1), unit)}
          className="px-3 py-2 text-slate-400 hover:text-white hover:bg-navy-700 transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>
      <div className="flex gap-1 bg-navy-900 p-1 rounded-lg">
        {([['h', L.hours], ['d', L.days]] as [TimeUnit, string][]).map(([u, label]) => (
          <button
            key={u}
            onClick={() => onChange(u === 'h' ? Math.min(value, 23) : Math.max(1, Math.min(value, 14)), u)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              unit === u ? 'bg-mustard text-navy-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="text-slate-300 text-sm">{suffix}</span>
    </div>
  )
}

// Template editor — the save button only exists while there is something to save
function TemplateEditor({
  value, savedValue, onChange, onSave,
}: { value: string; savedValue: string; onChange: (v: string) => void; onSave: () => void }) {
  const { lang } = useLang()
  const L = T[lang]
  const [justSaved, setJustSaved] = useState(false)
  const dirty    = value !== savedValue
  const segments = smsSegments(value)

  function save() {
    onSave()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        maxLength={480}
        className="w-full bg-navy-900 border border-navy-600 rounded-lg p-3 text-sm text-white leading-relaxed resize-none focus:outline-none focus:border-mustard"
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 text-xs">{L.insert}</span>
          {PLACEHOLDERS.map(p => (
            <button
              key={p}
              onClick={() => onChange(value + (value.endsWith(' ') || value.length === 0 ? '' : ' ') + p)}
              className="text-xs text-slate-400 bg-navy-700 border border-navy-600 hover:border-mustard/40 hover:text-mustard px-1.5 py-0.5 rounded transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Tooltip text={L.tipSegments}>
            <span className={`text-xs tabular-nums ${segments > 1 ? 'text-amber-400' : 'text-slate-500'}`}>
              {value.length} {L.chars} · {segments} SMS
            </span>
          </Tooltip>
          {dirty ? (
            <button
              onClick={save}
              className="text-xs bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {L.saveTemplate}
            </button>
          ) : justSaved ? (
            <span className="text-xs text-green-400">{L.saved}</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// Single-line input with the same only-when-dirty save behaviour.
// The length limit is soft — typing is never blocked; instead the counter goes
// red and saving is disabled until the text fits. A hard maxLength on a
// pre-filled field silently eats keystrokes and feels broken.
function DirtyTextInput({
  value, savedValue, onChange, onSave, maxLength, showCounter = false, hint,
}: {
  value: string
  savedValue: string
  onChange: (v: string) => void
  onSave: () => void
  maxLength?: number
  showCounter?: boolean
  hint?: string
}) {
  const { lang } = useLang()
  const L = T[lang]
  const [justSaved, setJustSaved] = useState(false)
  const dirty = value !== savedValue
  const over  = maxLength !== undefined && value.length > maxLength

  function save() {
    if (over) return
    onSave()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`flex-1 bg-navy-900 border text-white text-sm rounded-lg px-3 py-2 focus:outline-none ${
            over ? 'border-red-500/50 focus:border-red-400' : 'border-navy-600 focus:border-mustard'
          }`}
        />
        {showCounter && maxLength && (
          <span className={`text-xs tabular-nums shrink-0 ${over ? 'text-red-400' : value.length >= maxLength ? 'text-amber-400' : 'text-slate-500'}`}>
            {value.length}/{maxLength}
          </span>
        )}
        {dirty ? (
          <button
            onClick={save}
            disabled={over}
            title={over && maxLength !== undefined ? L.shortenTitle(maxLength) : undefined}
            className="shrink-0 text-xs bg-mustard hover:bg-mustard/90 disabled:opacity-40 disabled:cursor-not-allowed text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {L.save}
          </button>
        ) : justSaved ? (
          <span className="shrink-0 text-xs text-green-400">{L.saved}</span>
        ) : null}
      </div>
      {over && maxLength !== undefined ? (
        <p className="text-red-400 text-xs mt-1">{L.shortenText(maxLength)}</p>
      ) : hint ? (
        <p className="text-slate-500 text-xs mt-1">{hint}</p>
      ) : null}
    </div>
  )
}

/* ── Customer list — send/skip + per-person message editing ────────────────── */

function SendList({
  rows, sent, onSend, buttonLabel, emailBackup, skipped, onToggleSkip, template, custom, onCustomChange,
}: {
  rows: Row[]
  sent: Set<string>
  onSend: (id: string) => void
  buttonLabel: string
  emailBackup: boolean
  // When provided, the list runs in automatic mode: everyone is included by
  // default and individual customers can be skipped instead of sent to.
  skipped?: Set<string>
  onToggleSkip?: (id: string) => void
  // Per-person message overrides — editable from every row
  template: string
  custom: Record<string, string>
  onCustomChange: (id: string, text: string | null) => void
}) {
  const { lang } = useLang()
  const L = T[lang]
  const autoMode = skipped !== undefined && onToggleSkip !== undefined
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft,     setDraft]     = useState('')

  function openEditor(row: Row) {
    setEditingId(row.id)
    setDraft(custom[row.id] ?? personalize(template, row))
  }

  return (
    <div className="bg-navy-900 rounded-xl border border-navy-700 divide-y divide-navy-700/60 mt-3">
      {rows.map(r => {
        const isSent    = sent.has(r.id)
        const isSkipped = autoMode && skipped.has(r.id)
        const viaEmail  = !r.hasPhone && emailBackup
        const blocked   = !r.hasPhone && !emailBackup
        const hasCustom = custom[r.id] !== undefined
        const isEditing = editingId === r.id

        return (
          <div key={r.id}>
            <div className={`px-4 py-3 flex items-center gap-3 flex-wrap ${isSkipped ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${isSkipped ? 'text-slate-500' : 'text-white'}`}>{r.name}</p>
                  {hasCustom && !isSkipped && (
                    <span className="shrink-0 text-xs text-mustard bg-mustard/10 border border-mustard/20 px-1.5 py-0.5 rounded">
                      {L.custom}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-0.5">{r.service} · {r.when}</p>
              </div>

              {viaEmail && !isSent && !isSkipped && !blocked && (
                <span className="shrink-0 text-xs text-slate-500 bg-navy-700 border border-navy-600 px-1.5 py-0.5 rounded" title={L.viaEmailTitle}>
                  {L.viaEmail}
                </span>
              )}

              {/* Edit this person's message */}
              {!isSent && !isSkipped && !blocked && (
                <button
                  onClick={() => isEditing ? setEditingId(null) : openEditor(r)}
                  className={`shrink-0 text-xs px-2 py-1 rounded-lg border transition-colors ${
                    isEditing
                      ? 'text-mustard border-mustard/30 bg-mustard/10'
                      : 'text-slate-500 border-navy-600 hover:text-mustard hover:border-mustard/40'
                  }`}
                  title={L.editTitle(r.name.split(' ')[0])}
                >
                  ✎
                </button>
              )}

              {autoMode ? (
                blocked ? (
                  <span className="shrink-0 text-xs text-slate-500" title={L.noNumberTitle}>
                    {L.noNumber}
                  </span>
                ) : isSkipped ? (
                  <button
                    onClick={() => onToggleSkip(r.id)}
                    className="shrink-0 text-xs text-slate-400 border border-navy-600 hover:border-navy-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {L.includeAgain}
                  </button>
                ) : (
                  <>
                    <span className="shrink-0 text-xs text-green-400">{L.included}</span>
                    <button
                      onClick={() => onToggleSkip(r.id)}
                      className="shrink-0 text-xs text-slate-500 hover:text-red-400 transition-colors"
                      title={L.skipTitle}
                    >
                      {L.skip}
                    </button>
                  </>
                )
              ) : isSent ? (
                <span className="shrink-0 text-xs text-green-400">{L.sent}</span>
              ) : blocked ? (
                <span className="shrink-0 text-xs text-slate-500" title={L.noNumberTitle}>
                  {L.noNumber}
                </span>
              ) : (
                <button
                  onClick={() => onSend(r.id)}
                  className="shrink-0 text-xs text-mustard border border-mustard/30 hover:bg-mustard/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {buttonLabel}
                </button>
              )}
            </div>

            {/* Per-person message editor */}
            {isEditing && (
              <div className="px-4 pb-4 space-y-2 bg-navy-950/40">
                <p className="text-slate-500 text-xs uppercase tracking-wider pt-3">{L.messageTo(r.name.split(' ')[0])}</p>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={3}
                  maxLength={480}
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg p-3 text-sm text-white leading-relaxed resize-none focus:outline-none focus:border-mustard"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => { onCustomChange(r.id, draft); setEditingId(null) }}
                    className="text-xs bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {L.saveFor(r.name.split(' ')[0])}
                  </button>
                  {hasCustom && (
                    <button
                      onClick={() => { onCustomChange(r.id, null); setEditingId(null) }}
                      className="text-xs text-slate-400 hover:text-white border border-navy-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {L.backToTemplate}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-slate-500 hover:text-white transition-colors"
                  >
                    {L.cancel}
                  </button>
                  <Tooltip text={L.tipSegments}>
                    <span className={`ml-auto text-xs tabular-nums ${smsSegments(draft) > 1 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {draft.length} {L.chars} · {smsSegments(draft)} SMS
                    </span>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

export function SMSDashboard({ salonName }: { salonName: string }) {
  const { lang } = useLang()
  const L = T[lang]

  // Reminder flow
  const [reminderMode,   setReminderMode]   = useState<Mode>('auto')
  const [leadValue,      setLeadValue]      = useState(1)
  const [leadUnit,       setLeadUnit]       = useState<TimeUnit>('d')
  const [reminderText,        setReminderText]        = useState(() => defaultReminder(salonName))
  const [savedReminderText,   setSavedReminderText]   = useState(() => defaultReminder(salonName))
  const [reminderSubject,     setReminderSubject]     = useState(() => defaultReminderSubject(salonName))
  const [savedReminderSubject, setSavedReminderSubject] = useState(() => defaultReminderSubject(salonName))
  const [reminderSent,   setReminderSent]   = useState<Set<string>>(new Set())
  const [reminderSkip,   setReminderSkip]   = useState<Set<string>>(new Set())
  const [reminderCustom, setReminderCustom] = useState<Record<string, string>>({})

  // Review flow
  const [reviewMode,     setReviewMode]     = useState<Mode>('auto')
  const [afterValue,     setAfterValue]     = useState(2)
  const [afterUnit,      setAfterUnit]      = useState<TimeUnit>('h')
  const [reviewText,        setReviewText]        = useState(() => defaultReview(salonName))
  const [savedReviewText,   setSavedReviewText]   = useState(() => defaultReview(salonName))
  const [reviewSubject,     setReviewSubject]     = useState(() => defaultReviewSubject(salonName))
  const [savedReviewSubject, setSavedReviewSubject] = useState(() => defaultReviewSubject(salonName))
  const [reviewSent,     setReviewSent]     = useState<Set<string>>(new Set())
  const [reviewSkip,     setReviewSkip]     = useState<Set<string>>(new Set())
  const [reviewCustom,   setReviewCustom]   = useState<Record<string, string>>({})

  // Channel settings
  const [emailBackup,      setEmailBackup]      = useState(true)
  const [smsSender,        setSmsSender]        = useState(() => salonName.slice(0, SMS_SENDER_MAX))
  const [savedSmsSender,   setSavedSmsSender]   = useState(() => salonName.slice(0, SMS_SENDER_MAX))
  const [emailSender,      setEmailSender]      = useState(salonName)
  const [savedEmailSender, setSavedEmailSender] = useState(salonName)
  const [senderJustSaved,  setSenderJustSaved]  = useState(false)

  // Load saved settings — older saved templates may contain {salong}; swap in the real name
  useEffect(() => {
    try {
      const fix = (t: string) => t.replaceAll('{salong}', salonName)
      const r = localStorage.getItem('kiterank_sms_reminder');   if (r) { setReminderText(fix(r)); setSavedReminderText(fix(r)) }
      const v = localStorage.getItem('kiterank_sms_review');     if (v) { setReviewText(fix(v)); setSavedReviewText(fix(v)) }
      const rm = localStorage.getItem('kiterank_sms_reminder_mode'); if (rm === 'auto' || rm === 'manual') setReminderMode(rm)
      const vm = localStorage.getItem('kiterank_sms_review_mode');   if (vm === 'auto' || vm === 'manual') setReviewMode(vm)
      const rt = localStorage.getItem('kiterank_sms_reminder_lead')
      if (rt) { const m = rt.match(/^(\d+)(h|d)$/); if (m) { setLeadValue(Number(m[1])); setLeadUnit(m[2] as TimeUnit) } }
      const vt = localStorage.getItem('kiterank_sms_review_lead')
      if (vt) { const m = vt.match(/^(\d+)(h|d)$/); if (m) { setAfterValue(Number(m[1])); setAfterUnit(m[2] as TimeUnit) } }
      const eb = localStorage.getItem('kiterank_sms_email_backup'); if (eb !== null) setEmailBackup(eb === '1')
      const ss = localStorage.getItem('kiterank_sms_sender');   if (ss) { setSmsSender(ss.slice(0, SMS_SENDER_MAX)); setSavedSmsSender(ss.slice(0, SMS_SENDER_MAX)) }
      const es = localStorage.getItem('kiterank_email_sender'); if (es) { setEmailSender(es); setSavedEmailSender(es) }
      const rs = localStorage.getItem('kiterank_sms_reminder_subject'); if (rs) { setReminderSubject(rs); setSavedReminderSubject(rs) }
      const vs = localStorage.getItem('kiterank_sms_review_subject');   if (vs) { setReviewSubject(vs); setSavedReviewSubject(vs) }
      const rk = localStorage.getItem('kiterank_sms_reminder_skip'); if (rk) setReminderSkip(new Set(JSON.parse(rk)))
      const vk = localStorage.getItem('kiterank_sms_review_skip');   if (vk) setReviewSkip(new Set(JSON.parse(vk)))
      const rc = localStorage.getItem('kiterank_sms_reminder_custom'); if (rc) setReminderCustom(JSON.parse(rc))
      const vc = localStorage.getItem('kiterank_sms_review_custom');   if (vc) setReviewCustom(JSON.parse(vc))
    } catch { /* defaults */ }
  }, [salonName])

  function storeLead(value: number, unit: TimeUnit) {
    setLeadValue(value); setLeadUnit(unit)
    localStorage.setItem('kiterank_sms_reminder_lead', `${value}${unit}`)
  }

  function storeAfter(value: number, unit: TimeUnit) {
    setAfterValue(value); setAfterUnit(unit)
    localStorage.setItem('kiterank_sms_review_lead', `${value}${unit}`)
  }

  function toggleEmailBackup() {
    setEmailBackup(prev => {
      localStorage.setItem('kiterank_sms_email_backup', prev ? '0' : '1')
      return !prev
    })
  }

  function toggleSkip(set: Set<string>, setter: (s: Set<string>) => void, storageKey: string, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
    localStorage.setItem(storageKey, JSON.stringify([...next]))
  }

  function changeCustom(
    map: Record<string, string>,
    setter: (m: Record<string, string>) => void,
    storageKey: string,
    id: string,
    text: string | null,
  ) {
    const next = { ...map }
    if (text === null) delete next[id]
    else next[id] = text
    setter(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  function setAndStore<T extends string>(key: string, value: T, setter: (v: T) => void) {
    setter(value)
    localStorage.setItem(key, value)
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{L.pageTitle}</h1>
          <p className="text-slate-400 text-sm mt-1">{L.pageIntro}</p>
        </div>
        <HelpButton topic="sms" />
      </div>

      <div className="space-y-6">

      {/* Provider note */}
      <div className="bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-slate-500 shrink-0">✉</span>
        <p className="text-slate-500 text-xs">
          {L.providerNote}
        </p>
      </div>

      {/* Email fallback — applies to both flows */}
      <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-white text-sm font-medium">{L.emailBackup}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {L.emailBackupDesc}
          </p>
        </div>
        <Tooltip text={L.tipEmailBackup}>
          <button
            onClick={toggleEmailBackup}
            className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${emailBackup ? 'bg-green-500' : 'bg-navy-600'}`}
            aria-label={L.emailBackup}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${emailBackup ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </Tooltip>
      </div>

      {/* Sender names — what the customer sees as "from". One save for both fields. */}
      {(() => {
        const senderDirty = smsSender !== savedSmsSender || emailSender !== savedEmailSender
        const smsOver     = smsSender.length > SMS_SENDER_MAX
        return (
          <div className="bg-navy-800 border border-navy-700 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-white text-sm font-medium">{L.senderTitle}</p>
              {senderDirty ? (
                <button
                  onClick={() => {
                    if (smsOver) return
                    localStorage.setItem('kiterank_sms_sender', smsSender)
                    localStorage.setItem('kiterank_email_sender', emailSender)
                    setSavedSmsSender(smsSender)
                    setSavedEmailSender(emailSender)
                    setSenderJustSaved(true)
                    setTimeout(() => setSenderJustSaved(false), 2000)
                  }}
                  disabled={smsOver}
                  title={smsOver ? L.smsSenderOverTitle(SMS_SENDER_MAX) : undefined}
                  className="shrink-0 text-xs bg-mustard hover:bg-mustard/90 disabled:opacity-40 disabled:cursor-not-allowed text-navy-950 font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
                >
                  {L.save}
                </button>
              ) : senderJustSaved ? (
                <span className="shrink-0 text-xs text-green-400">{L.saved}</span>
              ) : null}
            </div>
            <p className="text-slate-500 text-xs mb-4">{L.senderDesc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-500">SMS</label>
                  <Tooltip text={L.tipSmsCounter}>
                    <span className={`text-xs tabular-nums ${smsOver ? 'text-red-400' : smsSender.length >= SMS_SENDER_MAX ? 'text-amber-400' : 'text-slate-500'}`}>
                      {smsSender.length}/{SMS_SENDER_MAX}
                    </span>
                  </Tooltip>
                </div>
                <input
                  type="text"
                  value={smsSender}
                  onChange={e => setSmsSender(e.target.value)}
                  className={`w-full bg-navy-900 border text-white text-sm rounded-lg px-3 py-2 focus:outline-none ${
                    smsOver ? 'border-red-500/50 focus:border-red-400' : 'border-navy-600 focus:border-mustard'
                  }`}
                />
                <p className={`text-xs mt-1 ${smsOver ? 'text-red-400' : 'text-slate-500'}`}>
                  {smsOver ? L.shortenText(SMS_SENDER_MAX) : L.smsSenderHint(SMS_SENDER_MAX)}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">{L.emailLabel}</label>
                <input
                  type="text"
                  value={emailSender}
                  onChange={e => setEmailSender(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
                />
                <p className="text-slate-500 text-xs mt-1">{L.emailSenderHint}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── 1. Bokningspåminnelser ───────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-white text-base font-semibold">{L.reminderTitle}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{L.reminderSub}</p>
          </div>
          <ModeToggle mode={reminderMode} onChange={m => setAndStore('kiterank_sms_reminder_mode', m, setReminderMode)} />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{L.whenSend}</p>
          <LeadStepper value={leadValue} unit={leadUnit} onChange={storeLead} suffix={L.beforeVisit} />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{L.yourTemplate}</p>
          <TemplateEditor
            value={reminderText}
            savedValue={savedReminderText}
            onChange={setReminderText}
            onSave={() => { localStorage.setItem('kiterank_sms_reminder', reminderText); setSavedReminderText(reminderText) }}
          />
        </div>

        {emailBackup && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{L.subjectLabel}</p>
            <DirtyTextInput
              value={reminderSubject}
              savedValue={savedReminderSubject}
              onChange={setReminderSubject}
              onSave={() => { localStorage.setItem('kiterank_sms_reminder_subject', reminderSubject); setSavedReminderSubject(reminderSubject) }}
              maxLength={80}
              hint={L.subjectHint}
            />
          </div>
        )}

        {reminderMode === 'auto' ? (
          <div>
            <p className="text-green-400/80 text-xs flex items-center gap-2">
              <span>●</span> {L.reminderAutoOn(formatLead(leadValue, leadUnit, lang))}
              {reminderSkip.size > 0 && <span className="text-slate-500">{L.excluded(reminderSkip.size)}</span>}.
            </p>
            <SendList
              rows={UPCOMING}
              sent={reminderSent}
              onSend={() => {}}
              buttonLabel=""
              emailBackup={emailBackup}
              skipped={reminderSkip}
              onToggleSkip={id => toggleSkip(reminderSkip, setReminderSkip, 'kiterank_sms_reminder_skip', id)}
              template={savedReminderText}
              custom={reminderCustom}
              onCustomChange={(id, text) => changeCustom(reminderCustom, setReminderCustom, 'kiterank_sms_reminder_custom', id, text)}
            />
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{L.reminderManualHead}</p>
            <SendList
              rows={UPCOMING}
              sent={reminderSent}
              onSend={id => setReminderSent(prev => new Set(prev).add(id))}
              buttonLabel={L.sendReminder}
              emailBackup={emailBackup}
              template={savedReminderText}
              custom={reminderCustom}
              onCustomChange={(id, text) => changeCustom(reminderCustom, setReminderCustom, 'kiterank_sms_reminder_custom', id, text)}
            />
          </div>
        )}
      </div>

      {/* ── 2. Recensionsförfrågan ───────────────────────────────────────── */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-white text-base font-semibold">{L.reviewTitle}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{L.reviewSub}</p>
          </div>
          <ModeToggle mode={reviewMode} onChange={m => setAndStore('kiterank_sms_review_mode', m, setReviewMode)} />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{L.whenSend}</p>
          <LeadStepper value={afterValue} unit={afterUnit} onChange={storeAfter} suffix={L.afterVisit} minValue={0} />
          {afterUnit === 'h' && afterValue === 0 && (
            <p className="text-slate-500 text-xs mt-1.5">{L.zeroHours}</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{L.yourTemplate}</p>
          <TemplateEditor
            value={reviewText}
            savedValue={savedReviewText}
            onChange={setReviewText}
            onSave={() => { localStorage.setItem('kiterank_sms_review', reviewText); setSavedReviewText(reviewText) }}
          />
        </div>

        {emailBackup && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{L.subjectLabel}</p>
            <DirtyTextInput
              value={reviewSubject}
              savedValue={savedReviewSubject}
              onChange={setReviewSubject}
              onSave={() => { localStorage.setItem('kiterank_sms_review_subject', reviewSubject); setSavedReviewSubject(reviewSubject) }}
              maxLength={80}
              hint={L.subjectHint}
            />
          </div>
        )}

        {reviewMode === 'auto' ? (
          <div>
            <p className="text-green-400/80 text-xs flex items-center gap-2">
              <span>●</span> {L.reviewAutoOn(formatAfter(afterValue, afterUnit, lang))}
              {reviewSkip.size > 0 && <span className="text-slate-500">{L.excluded(reviewSkip.size)}</span>}.
            </p>
            <SendList
              rows={COMPLETED}
              sent={reviewSent}
              onSend={() => {}}
              buttonLabel=""
              emailBackup={emailBackup}
              skipped={reviewSkip}
              onToggleSkip={id => toggleSkip(reviewSkip, setReviewSkip, 'kiterank_sms_review_skip', id)}
              template={savedReviewText}
              custom={reviewCustom}
              onCustomChange={(id, text) => changeCustom(reviewCustom, setReviewCustom, 'kiterank_sms_review_custom', id, text)}
            />
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{L.reviewManualHead}</p>
            <SendList
              rows={COMPLETED}
              sent={reviewSent}
              onSend={id => setReviewSent(prev => new Set(prev).add(id))}
              buttonLabel={L.sendRequest}
              emailBackup={emailBackup}
              template={savedReviewText}
              custom={reviewCustom}
              onCustomChange={(id, text) => changeCustom(reviewCustom, setReviewCustom, 'kiterank_sms_review_custom', id, text)}
            />
          </div>
        )}

        <p className="text-slate-500 text-xs border-t border-navy-700 pt-3">
          {L.policy}
        </p>
      </div>

      </div>
    </div>
  )
}
