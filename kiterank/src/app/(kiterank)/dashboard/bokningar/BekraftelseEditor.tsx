'use client'
import { useLang } from '@/components/LanguageProvider'
import { CONFIRM_MAX, PLACEHOLDERS, previewOf } from '@/lib/bookingText'

/* Texten och dess platshållare bor i biblioteket, eftersom utskicket behöver
   samma sak — en server kan inte importera ur en 'use client'-modul. */
export { CONFIRM_MAX, PLACEHOLDERS, previewOf }

/*
 * The booking confirmation the customer receives.
 *
 * It appears in two places — under Inställningar with the rest of the booking
 * policy, and under SMS beside the reminder and review templates — because it
 * belongs to both: it is a rule about bookings and it is a message. The state
 * lives in the shell above, so the two are always the same text.
 */

const T = {
  sv: {
    title:        'Bokningsbekräftelse',
    intro:        'Texten kunden möter när bokningen är klar. Samma text blir SMS- och e-postbekräftelsen när utskicken kopplas på.',
    placeholders: 'Klicka för att infoga:',
    preview:      'Så ser det ut för kunden:',
    save:         'Spara texten',
    reset:        'Återställ till standard',
    saved:        'Sparat — nästa bokning får din text.',
    count:        (n: number) => `${n}/${CONFIRM_MAX} tecken`,
    standard:     'Din tid är bokad och klar.',
    smsNote:      'Skickas direkt när kunden bokar. Påminnelsen och recensionsförfrågan nedan är egna utskick.',
  },
  en: {
    title:        'Booking confirmation',
    intro:        'The text your customer sees once the booking is made. The same text becomes the SMS and email confirmation once sendouts are connected.',
    placeholders: 'Click to insert:',
    preview:      'What the customer sees:',
    save:         'Save text',
    reset:        'Reset to standard',
    saved:        'Saved — the next booking gets your text.',
    count:        (n: number) => `${n}/${CONFIRM_MAX} characters`,
    standard:     'Your time is booked.',
    smsNote:      'Sent the moment the customer books. The reminder and review request below are their own sendouts.',
  },
}

export function BekraftelseEditor({ value, onChange, onSave, saved, error, showSmsNote = false }: {
  value:    string
  onChange: (v: string) => void
  onSave:   (v: string) => void
  saved:    boolean
  error:    string
  /** Inside the SMS tab, say how this message differs from the others. */
  showSmsNote?: boolean
}) {
  const { lang } = useLang()
  const L = T[lang]

  function insert(ph: string) {
    onChange((value ? value + (value.endsWith(' ') ? '' : ' ') : '') + ph)
  }

  return (
    <div>
      <h2 className="text-white font-semibold text-lg mb-1">{L.title}</h2>
      <p className="text-slate-400 text-sm mb-1">{L.intro}</p>
      {showSmsNote && <p className="text-slate-500 text-xs mb-4">{L.smsNote}</p>}
      {!showSmsNote && <div className="mb-4" />}

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={L.standard}
        rows={4}
        maxLength={CONFIRM_MAX}
        className="w-full bg-navy-900 border border-navy-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-mustard/60 resize-vertical"
      />
      <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 text-xs mr-1">{L.placeholders}</span>
          {PLACEHOLDERS.map(ph => (
            <button key={ph} onClick={() => insert(ph)}
              className="px-2 py-0.5 bg-navy-800 border border-navy-600 text-slate-300 hover:text-mustard hover:border-mustard/40 rounded text-xs font-mono transition-colors">
              {ph}
            </button>
          ))}
        </div>
        <span className="text-slate-600 text-xs">{L.count(value.length)}</span>
      </div>

      {/* Live preview with an example visit filled in */}
      <div className="mt-4 bg-navy-900 border border-navy-700 rounded-xl p-4">
        <p className="text-slate-500 text-xs mb-2">{L.preview}</p>
        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
          {previewOf(value.trim() || L.standard)}
        </p>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(value.trim())}
          className="px-4 py-2 bg-mustard text-navy-950 rounded-lg text-sm font-semibold hover:bg-mustard/90 transition-colors">
          {L.save}
        </button>
        <button onClick={() => { onChange(''); onSave('') }}
          className="px-4 py-2 bg-navy-800 border border-navy-600 text-slate-400 hover:text-white rounded-lg text-sm transition-colors">
          {L.reset}
        </button>
      </div>
      {saved && <p className="text-green-400 text-xs mt-3">{L.saved}</p>}
      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </div>
  )
}
