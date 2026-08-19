'use client'
import { useCallback, useEffect, useState } from 'react'
import {
  TEMPLATES, settingsFor, type TemplateKind, type TemplateRow, type TemplateSettings,
} from '@/lib/messageTemplates'
import type { Channel } from '@/lib/sendMessage'
import { previewOf, CONFIRM_MAX } from '@/lib/bookingText'
import { smsEstimate, SMS_MAX } from '@/lib/smser'

/*
 * Meddelandena till kunden, samlade.
 *
 * Bekräftelsen låg tidigare under Inställningar och avbokningen fanns inte alls.
 * Att sprida dem betyder att salongen aldrig ser vad kunden faktiskt får utmed
 * hela besöket — och det är helheten som avgör om de känner sig omhändertagna
 * eller lämnade i ovisshet.
 *
 * Varje ruta säger fyra saker: vad meddelandet är, när det går ut, hur det går
 * ut, och exakt hur det ser ut för kunden. Det sista är det viktigaste. En
 * platshållare som inte går att förhandsvisa är en text salongen skriver blint.
 *
 * Vid SMS räknas tecknen mot de 160 som ryms i ett enda meddelande, och räknaren
 * mäter vad kunden får — mallen med värden isatta, plus länken och raden om att
 * svar inte går fram. Att mäta rutans innehåll hade underskattat med ett femtiotal
 * tecken, och skillnaden mellan ett och två SMS är dubbla priset per kund.
 */

type Utkast = Partial<Record<TemplateKind, Partial<TemplateSettings>>>

export function MeddelandenTab() {
  const [rows,      setRows]      = useState<TemplateRow[]>([])
  const [reviewUrl, setReviewUrl] = useState('')
  const [urlUtkast, setUrlUtkast] = useState<string | null>(null)
  const [smsReady,  setSmsReady]  = useState(false)
  /* Länken och raden om att svar inte går fram läggs till vid sändning. De
     räknas ändå in här — annars tror salongen att de ligger på ett SMS och
     betalar för två. */
  const [smsExtra,  setSmsExtra]  = useState<Record<string, string>>({})
  const [utkast,    setUtkast]    = useState<Utkast>({})
  const [sparad,    setSparad]    = useState<string | null>(null)
  const [fel,       setFel]       = useState('')
  const [laddad,    setLaddad]    = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/message-templates')
      if (res.ok) {
        const d = await res.json()
        setRows(d.templates ?? [])
        setReviewUrl(d.reviewUrl ?? '')
        setSmsReady(Boolean(d.smsReady))
        setSmsExtra(d.smsExtra ?? {})
      }
    } finally {
      setLaddad(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function skicka(kropp: Record<string, unknown>, märke: string) {
    setFel(''); setSparad(null)
    const res = await fetch('/api/message-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kropp),
    })
    if (!res.ok) { setFel(T.failed); return }
    setSparad(märke)
    await load()
    setTimeout(() => setSparad(s => (s === märke ? null : s)), 2500)
  }

  /* Kanalen och strömbrytaren sparas direkt. De är enskilda val, inte en text
     man skriver klart — en Spara-knapp för en strömbrytare är ett extra klick
     utan syfte. */
  async function sparaVal(kind: TemplateKind, patch: Record<string, unknown>) {
    setUtkast(u => ({ ...u, [kind]: { ...u[kind], ...omvandla(patch) } }))
    await skicka({ kind, ...patch }, kind)
  }

  if (!laddad) return null

  return (
    <div>
      <h2 className="text-white font-semibold text-lg mb-1">{T.title}</h2>
      <p className="text-slate-400 text-sm mb-5">{T.intro}</p>

      {!smsReady && (
        <p className="text-slate-400 text-xs rounded-lg border-l-2 border-slate-600 pl-3 mb-5">
          {T.noSms}
        </p>
      )}

      {/* Vad kanalerna inte klarar. En kund som svarar på ett utskick och tror
          sig ha avbokat är sämre än inget utskick alls, så salongen ska veta
          vad kunden möter innan de väljer. */}
      <p className="text-slate-400 text-xs rounded-lg border-l-2 border-slate-600 pl-3 mb-5">
        {T.oneWay}
        {!smsExtra.confirmation && <> {T.noPhone}</>}
      </p>

      <p className="text-slate-400 text-xs rounded-lg border-l-2 border-slate-600 pl-3 mb-5">
        {T.smsRule}
      </p>

      <div className="space-y-4">
        {TEMPLATES.map(spec => {
          const sparat = settingsFor(rows, spec.kind)
          const s      = { ...sparat, ...utkast[spec.kind] } as TemplateSettings
          const ändrad = utkast[spec.kind]?.body !== undefined && utkast[spec.kind]?.body !== sparat.body
          const egen   = rows.some(r => r.kind === spec.kind)
          const tidsstyrd = Boolean(spec.ledtid)
          /* Vad kunden får: mallen med värden isatta, plus det som läggs till
             vid sändning. Räknaren mäter det och inte rutans innehåll — en mall
             är alltid kortare än sitt resultat. */
          const extra     = smsExtra[spec.kind] ?? ''
          const smsText   = `${previewOf(s.body)} ${extra}`.trim()
          /* Uppskattningen räknar med det längsta en platshållare kan bli, så
             gränsen håller även för kunden med det långa namnet. */
          const smsLängd  = smsEstimate(s.body, extra)
          const smsBara   = s.channel !== 'email'
          const förLångt  = smsBara && smsLängd > SMS_MAX

          return (
            <div key={spec.kind} className="rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-white font-semibold text-sm">{spec.namn}</h3>
                {egen && <span className="text-[10px] font-bold uppercase tracking-wide text-yellow-500">{T.own}</span>}
                <span className="flex-1" />
                {/* Bekräftelsen går inte att stänga av. En kund som bokar och
                    inte får något besked ringer salongen, och då har systemet
                    skapat arbete i stället för att ta bort det. */}
                {tidsstyrd && (
                  <button
                    onClick={() => void sparaVal(spec.kind, { enabled: !s.enabled })}
                    className={`text-xs font-semibold rounded-full px-3 py-1 ${
                      s.enabled ? 'bg-green-500/15 text-green-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {s.enabled ? T.on : T.off}
                  </button>
                )}
              </div>

              <p className="text-slate-400 text-xs mb-3">{spec.när}</p>

              {/* Tidpunkten, bara för de meddelanden som styrs av en klocka. */}
              {tidsstyrd && (
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="text-slate-400 text-xs">
                    {spec.kind === 'reminder' ? T.before : T.after}
                  </span>
                  <input
                    type="number"
                    min={spec.kind === 'review' ? 0 : 1}
                    max={s.leadUnit === 'h' ? 72 : 14}
                    value={s.leadValue}
                    onChange={e => setUtkast(u => ({
                      ...u, [spec.kind]: { ...u[spec.kind], leadValue: Number(e.target.value) },
                    }))}
                    onBlur={() => void sparaVal(spec.kind, { lead_value: s.leadValue })}
                    className="w-16 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-sm px-2 py-1"
                  />
                  {([['h', T.hours], ['d', T.days]] as [('h' | 'd'), string][]).map(([u, label]) => (
                    <button
                      key={u}
                      onClick={() => void sparaVal(spec.kind, { lead_unit: u })}
                      className={`text-xs rounded-lg px-2.5 py-1 ${
                        s.leadUnit === u ? 'bg-slate-700 text-white' : 'text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {spec.kind === 'review' && s.leadValue === 0 && s.leadUnit === 'h' && (
                    <span className="text-slate-500 text-xs">{T.rightAfter}</span>
                  )}
                </div>
              )}

              {/* Kanalen. Samma val för alla fyra, så salongen lär sig det en gång. */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-slate-400 text-xs">{T.channel}</span>
                {([['email', T.chEmail], ['sms', T.chSms], ['both', T.chBoth]] as [Channel, string][]).map(([c, label]) => (
                  <button
                    key={c}
                    onClick={() => void sparaVal(spec.kind, { channel: c })}
                    disabled={!smsReady && c !== 'email'}
                    title={!smsReady && c !== 'email' ? T.noSmsShort : undefined}
                    className={`text-xs rounded-lg px-2.5 py-1 ${
                      s.channel === c ? 'bg-slate-700 text-white'
                      : !smsReady && c !== 'email' ? 'text-slate-600'
                      : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                value={s.body}
                onChange={e => setUtkast(u => ({
                  ...u, [spec.kind]: { ...u[spec.kind], body: e.target.value },
                }))}
                rows={3}
                maxLength={CONFIRM_MAX}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-sm p-2.5 resize-y"
              />

              <div className="flex items-center gap-2 flex-wrap mt-2">
                <span className="text-slate-500 text-xs">{T.insert}</span>
                {spec.fält.map(f => (
                  <button
                    key={f}
                    onClick={() => setUtkast(u => ({
                      ...u,
                      [spec.kind]: {
                        ...u[spec.kind],
                        body: (s.body ? s.body + (s.body.endsWith(' ') ? '' : ' ') : '') + f,
                      },
                    }))}
                    className="text-xs text-slate-300 border border-slate-700 rounded px-2 py-0.5 hover:border-slate-500"
                  >
                    {f}
                  </button>
                ))}
                <span className="flex-1" />
                {/* Utrymmet, medan de skriver. Vid SMS räknas det kunden får av
                    de 160 tecken som ryms i ett meddelande; vid e-post räcker
                    rutans egen gräns. */}
                {smsBara ? (
                  <span className={`text-xs ${förLångt ? 'text-red-400' : smsLängd > SMS_MAX - 20 ? 'text-yellow-500' : 'text-slate-500'}`}>
                    {smsLängd}/{SMS_MAX}
                  </span>
                ) : (
                  <span className={`text-xs ${s.body.length >= CONFIRM_MAX ? 'text-red-400' : 'text-slate-500'}`}>
                    {s.body.length}/{CONFIRM_MAX}
                  </span>
                )}
              </div>

              {smsBara && (
                <p className={`text-xs mt-1.5 ${förLångt ? 'text-red-400' : 'text-slate-500'}`}>
                  {förLångt ? T.tooLong : T.smsCount(extra.length)}
                </p>
              )}

              <div className="mt-3 rounded-lg bg-slate-800/60 p-3">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{T.preview}</p>
                <p className="text-slate-200 text-sm">
                  {s.body.trim()
                    ? (s.channel === 'email' ? previewOf(s.body) : smsText)
                    : T.emptyPreview}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => void skicka({ kind: spec.kind, body: s.body }, spec.kind)}
                  disabled={!ändrad || förLångt}
                  className={`text-xs font-bold rounded-lg px-4 py-2 ${
                    ändrad && !förLångt ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {T.save}
                </button>
                {egen && (
                  <button
                    onClick={() => void skicka({ kind: spec.kind, body: spec.standard }, spec.kind)}
                    className="text-xs text-slate-400 underline"
                  >
                    {T.reset}
                  </button>
                )}
                {sparad === spec.kind && <span className="text-xs text-green-400">{T.saved}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recensionslänken. Utan den kan förfrågan inte skickas alls, så den står
          här och inte begravd under Inställningar. */}
      <div className="rounded-xl border border-slate-800 p-4 mt-4">
        <h3 className="text-white font-semibold text-sm mb-1">{T.linkTitle}</h3>
        <p className="text-slate-400 text-xs mb-3">{T.linkHelp}</p>
        <div className="flex gap-2">
          <input
            value={urlUtkast ?? reviewUrl}
            onChange={e => setUrlUtkast(e.target.value)}
            placeholder="https://g.page/r/..."
            className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 text-sm px-2.5 py-2"
          />
          <button
            onClick={() => void skicka({ reviewUrl: urlUtkast ?? reviewUrl }, 'url').then(() => setUrlUtkast(null))}
            disabled={urlUtkast === null || urlUtkast === reviewUrl}
            className={`text-xs font-bold rounded-lg px-4 py-2 whitespace-nowrap ${
              urlUtkast !== null && urlUtkast !== reviewUrl
                ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {T.save}
          </button>
        </div>
        {sparad === 'url' && <p className="text-xs text-green-400 mt-2">{T.saved}</p>}
      </div>

      {fel && <p className="text-red-400 text-sm mt-4">{fel}</p>}
    </div>
  )
}

/* API:t talar databasens språk, panelen sitt eget. Översättningen sker här så
   att ett sparat val syns direkt utan att invänta omläsningen. */
function omvandla(patch: Record<string, unknown>): Partial<TemplateSettings> {
  const ut: Partial<TemplateSettings> = {}
  if (patch.channel    !== undefined) ut.channel   = patch.channel as Channel
  if (patch.enabled    !== undefined) ut.enabled   = Boolean(patch.enabled)
  if (patch.lead_value !== undefined) ut.leadValue = Number(patch.lead_value)
  if (patch.lead_unit  !== undefined) ut.leadUnit  = patch.lead_unit as 'h' | 'd'
  return ut
}

const T = {
  title:        'Meddelanden till kunden',
  intro:        'Vad kunden får, när, och på vilket sätt. Vid en avbokning kan du skriva om texten för den enskilda kunden innan den går.',
  smsRule:      'Varje SMS hålls till ett meddelande. Räknaren visar hur mycket av de 160 tecknen som går åt när platshållarna fyllts i.',
  channel:      'Skickas som',
  chEmail:      'E-post',
  chSms:        'SMS',
  chBoth:       'Båda',
  before:       'Före besöket:',
  after:        'Efter besöket:',
  hours:        'timmar',
  days:         'dagar',
  rightAfter:   'direkt när besöket markeras som avslutat',
  on:           'På',
  off:          'Av',
  insert:       'Infoga:',
  preview:      'Så ser det ut för kunden',
  emptyPreview: 'Tom text — kunden får bara tiden och behandlingen, ingen egen formulering från dig.',
  smsCount:     (n: number) => `Räknat på vad kunden får. ${n} tecken går till länk och raden om att svar inte går fram.`,
  tooLong:      'För långt för ett SMS. Korta texten — annars skickas den som två, till dubbel kostnad per kund.',
  save:         'Spara',
  saved:        'Sparat',
  reset:        'Återställ till standard',
  own:          'Egen text',
  noSms:        'SMS är inte påslaget ännu, så bara e-post kan väljas. Så fort SMS är kopplat dyker valet upp här.',
  oneWay:       'Varken mail eller SMS går att svara på. Vi lägger till en rad om det, tillsammans med ditt telefonnummer, så kunden vet var de ska höra av sig.',
  noPhone:      'Du har inget telefonnummer på hemsidan — fyll i det under Webbplats, annars står kunden utan väg tillbaka.',
  noSmsShort:   'SMS är inte påslaget ännu',
  linkTitle:    'Din länk för omdömen',
  linkHelp:     'Dit recensionsförfrågan skickar kunden. Hämta den i din Google-företagsprofil under Be om omdömen. Utan länk skickas ingen förfrågan.',
  failed:       'Kunde inte spara. Försök igen.',
}
