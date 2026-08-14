'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { personalize, smsSegments, formatPrice, type Row, type Flow } from './smsData'

/*
 * Everyone who is about to get a message, in one list at the top of the page.
 *
 * The two sendouts used to carry a customer list each, which meant reading the
 * same names twice and switching sections to answer one question: what is
 * going out, to whom, and can I stop it. One list answers that.
 *
 * A row is one line the eye can scan — name, visit, what it is worth, and the
 * two switches. Rewriting a message is the rarer act, so it hides behind a
 * single pencil that asks which of the two you mean.
 */

const T = {
  sv: {
    title:     'Vad som skickas',
    intro:     'Alla kommande och nyss avslutade besök. Slå av eller på varje utskick för sig, eller skriv om texten för en enskild kund.',
    reminder:  'Påminnelse',
    review:    'Recensionsförfrågan',
    /* The menu names the two sendouts exactly as their sections do below, so
       there is never a doubt about which text is being changed. */
    reminderFull: 'Påminnelse inför besök',
    reviewFull:   'Recensionsförfrågan efter besök',
    editWhich: 'Vilken text vill du ändra?',
    edit:      'Redigera meddelande',
    sent:      'Skickad',
    send:      'Skicka nu',
    noNumber:  'Saknar mobilnummer',
    noNumberTitle: 'Kunden har inget mobilnummer och e-postreserven är avstängd — inget skickas.',
    viaEmail:  'via e-post',
    viaEmailTitle: 'Kunden saknar mobilnummer, så meddelandet går som e-post.',
    custom:    'Egen text',
    messageTo: (n: string, m: string) => `${m} till ${n}`,
    saveFor:   (n: string) => `Spara för ${n}`,
    backToTemplate: 'Återgå till mallen',
    cancel:    'Avbryt',
    chars:     'tecken',
    upcoming:  'Kommande besök',
    completed: 'Avslutade besök',
    tipOn:     (m: string, w: string) => `${m} är på — skickas ${w}. Klicka för att stänga av för just den här kunden.`,
    tipOff:    (m: string) => `${m} är avstängd för den här kunden. Klicka för att slå på igen.`,
    tipSegments: 'Ett SMS rymmer 160 tecken. Längre texter delas upp i flera SMS, och varje del kostar som ett eget SMS.',
    tipPrice:  'Vad besöket är värt. Ju dyrare tid, desto mer kostar en utebliven kund.',
    manual:    'skickas när du trycker',
    empty:     'Inga besök att skicka till just nu.',
  },
  en: {
    title:     'What goes out',
    intro:     'Every upcoming and recently finished visit. Switch each sendout on or off on its own, or rewrite the text for a single customer.',
    reminder:  'Reminder',
    review:    'Review request',
    reminderFull: 'Reminder before the visit',
    reviewFull:   'Review request after the visit',
    editWhich: 'Which text do you want to change?',
    edit:      'Edit message',
    sent:      'Sent',
    send:      'Send now',
    noNumber:  'No mobile number',
    noNumberTitle: 'The customer has no mobile number and the email fallback is off — nothing is sent.',
    viaEmail:  'via email',
    viaEmailTitle: 'The customer has no mobile number, so the message goes as email.',
    custom:    'Custom text',
    messageTo: (n: string, m: string) => `${m} to ${n}`,
    saveFor:   (n: string) => `Save for ${n}`,
    backToTemplate: 'Back to the template',
    cancel:    'Cancel',
    chars:     'characters',
    upcoming:  'Upcoming visits',
    completed: 'Finished visits',
    tipOn:     (m: string, w: string) => `${m} is on — sent ${w}. Click to switch it off for this customer.`,
    tipOff:    (m: string) => `${m} is off for this customer. Click to switch it back on.`,
    tipSegments: 'One SMS holds 160 characters. Longer texts are split into several SMS, and each part costs as its own SMS.',
    tipPrice:  'What the visit is worth. The pricier the slot, the more a no-show costs.',
    manual:    'sent when you press',
    empty:     'No visits to send to right now.',
  },
}

export type FlowState = {
  mode:     'auto' | 'manual'
  template: string
  skip:     Set<string>
  sent:     Set<string>
  custom:   Record<string, string>
  timing:   string
}

type Editing = { flow: Flow; id: string } | null

/** A switch with its name beside it — the two sit together at the customer. */
function FlowSwitch({ on, label, title, onChange, disabled }: {
  on: boolean; label: string; title: string; onChange: () => void; disabled?: boolean
}) {
  return (
    <Tooltip text={title}>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition-colors ${
          disabled ? 'border-navy-700 opacity-40 cursor-default'
          : on ? 'border-green-500/40 bg-green-500/10 hover:border-green-500/60'
               : 'border-navy-600 bg-navy-800 hover:border-navy-500'
        }`}
      >
        <span className={`relative w-8 h-[18px] rounded-full transition-colors shrink-0 ${on ? 'bg-green-500' : 'bg-navy-600'}`}>
          <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${on ? 'left-[16px]' : 'left-0.5'}`} />
        </span>
        <span className={`text-xs whitespace-nowrap ${on ? 'text-green-300' : 'text-slate-500'}`}>{label}</span>
      </button>
    </Tooltip>
  )
}

export function KundlistaTab({
  rows, emailBackup, reminder, review, onToggle, onSend, onCustomChange,
}: {
  rows:        Row[]
  emailBackup: boolean
  reminder:    FlowState
  review:      FlowState
  onToggle:       (flow: Flow, id: string) => void
  onSend:         (flow: Flow, id: string) => void
  onCustomChange: (flow: Flow, id: string, text: string | null) => void
}) {
  const { lang } = useLang()
  const L = T[lang]

  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)
  const [draft,   setDraft]   = useState('')

  function openEditor(flow: Flow, row: Row) {
    const state = flow === 'reminder' ? reminder : review
    setEditing({ flow, id: row.id })
    setDraft(state.custom[row.id] ?? personalize(state.template, row))
    setMenuFor(null)
  }

  const groups: { title: string; rows: Row[] }[] = [
    { title: L.upcoming,  rows: rows.filter(r => r.stage === 'upcoming')  },
    { title: L.completed, rows: rows.filter(r => r.stage === 'completed') },
  ]

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 p-6 space-y-5">
      <div>
        <h2 className="text-white text-base font-semibold">{L.title}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{L.intro}</p>
      </div>

      {rows.length === 0 && <p className="text-slate-500 text-sm">{L.empty}</p>}

      {groups.map(g => g.rows.length === 0 ? null : (
        <div key={g.title}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{g.title}</p>
          <div className="bg-navy-900 rounded-xl border border-navy-700 divide-y divide-navy-700/60">
            {g.rows.map(r => {
              const blocked   = !r.hasPhone && !emailBackup
              const remOn     = !reminder.skip.has(r.id)
              const revOn     = !review.skip.has(r.id)
              const isEditing = editing?.id === r.id
              const editState = isEditing && editing ? (editing.flow === 'reminder' ? reminder : review) : null
              const editLabel = isEditing && editing ? (editing.flow === 'reminder' ? L.reminderFull : L.reviewFull) : ''
              const hasCustom = !!(editState && editing && editState.custom[r.id] !== undefined)

              const when = (s: FlowState) => s.mode === 'auto' ? s.timing : L.manual

              return (
                <div key={r.id} className="px-4 py-3">
                  {/* Name, visit, worth — then the two switches and the pencil */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white">{r.name}</p>
                        {!r.hasPhone && emailBackup && (
                          <span className="text-xs text-slate-500 bg-navy-700 border border-navy-600 px-1.5 py-0.5 rounded" title={L.viaEmailTitle}>
                            {L.viaEmail}
                          </span>
                        )}
                        {blocked && (
                          <span className="text-xs text-amber-400/80" title={L.noNumberTitle}>{L.noNumber}</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {r.service} · {r.when} ·{' '}
                        <Tooltip text={L.tipPrice}>
                          <span className="text-slate-400 font-medium">{formatPrice(r.price)}</span>
                        </Tooltip>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap ml-auto">
                      <FlowSwitch
                        on={remOn && !blocked}
                        disabled={blocked}
                        label={L.reminder}
                        title={blocked ? L.noNumberTitle : remOn ? L.tipOn(L.reminder, when(reminder)) : L.tipOff(L.reminder)}
                        onChange={() => onToggle('reminder', r.id)}
                      />
                      <FlowSwitch
                        on={revOn && !blocked}
                        disabled={blocked}
                        label={L.review}
                        title={blocked ? L.noNumberTitle : revOn ? L.tipOn(L.review, when(review)) : L.tipOff(L.review)}
                        onChange={() => onToggle('review', r.id)}
                      />

                      {/* One pencil, two texts — the menu asks which */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuFor(menuFor === r.id ? null : r.id)}
                          aria-label={L.edit}
                          title={L.edit}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                            menuFor === r.id || isEditing
                              ? 'text-mustard border-mustard/40 bg-mustard/10'
                              : 'text-slate-500 border-navy-600 hover:text-mustard hover:border-mustard/40'
                          }`}
                        >
                          ✎
                        </button>
                        {menuFor === r.id && (
                          <>
                            {/* Click anywhere else to dismiss */}
                            <button
                              className="fixed inset-0 z-10 cursor-default"
                              aria-hidden
                              tabIndex={-1}
                              onClick={() => setMenuFor(null)}
                            />
                            <div className="absolute right-0 top-9 z-20 w-64 bg-navy-800 border border-navy-600 rounded-xl shadow-xl overflow-hidden">
                              <p className="px-3 pt-2.5 pb-1.5 text-[11px] uppercase tracking-wider text-slate-500">{L.editWhich}</p>
                              {([['reminder', L.reminderFull, reminder], ['review', L.reviewFull, review]] as [Flow, string, FlowState][]).map(([flow, label, state]) => (
                                <button
                                  key={flow}
                                  onClick={() => openEditor(flow, r)}
                                  className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-navy-700 transition-colors flex items-center justify-between gap-2"
                                >
                                  <span>{label}</span>
                                  {state.custom[r.id] !== undefined && (
                                    <span className="text-[10px] text-mustard bg-mustard/10 border border-mustard/20 px-1.5 py-0.5 rounded shrink-0">
                                      {L.custom}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Manual mode sends from the row itself */}
                      {reminder.mode === 'manual' && r.stage === 'upcoming' && !blocked && remOn && (
                        reminder.sent.has(r.id)
                          ? <span className="text-xs text-green-400">{L.sent}</span>
                          : <button onClick={() => onSend('reminder', r.id)}
                              className="text-xs text-mustard border border-mustard/30 hover:bg-mustard/10 px-3 py-1.5 rounded-lg transition-colors">
                              {L.send}
                            </button>
                      )}
                      {review.mode === 'manual' && r.stage === 'completed' && !blocked && revOn && (
                        review.sent.has(r.id)
                          ? <span className="text-xs text-green-400">{L.sent}</span>
                          : <button onClick={() => onSend('review', r.id)}
                              className="text-xs text-mustard border border-mustard/30 hover:bg-mustard/10 px-3 py-1.5 rounded-lg transition-colors">
                              {L.send}
                            </button>
                      )}
                    </div>
                  </div>

                  {/* The chosen message, open for rewriting */}
                  {isEditing && editing && editState && (
                    <div className="mt-3 bg-navy-950/50 border border-navy-700 rounded-lg p-3 space-y-2">
                      <p className="text-slate-500 text-xs uppercase tracking-wider">
                        {L.messageTo(r.name.split(' ')[0], editLabel)}
                      </p>
                      <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        rows={3}
                        maxLength={480}
                        className="w-full bg-navy-900 border border-navy-600 rounded-lg p-3 text-sm text-white leading-relaxed resize-none focus:outline-none focus:border-mustard"
                      />
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => { onCustomChange(editing.flow, r.id, draft); setEditing(null) }}
                          className="text-xs bg-mustard hover:bg-mustard/90 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {L.saveFor(r.name.split(' ')[0])}
                        </button>
                        {hasCustom && (
                          <button
                            onClick={() => { onCustomChange(editing.flow, r.id, null); setEditing(null) }}
                            className="text-xs text-slate-400 hover:text-white border border-navy-600 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {L.backToTemplate}
                          </button>
                        )}
                        <button onClick={() => setEditing(null)} className="text-xs text-slate-500 hover:text-white transition-colors">
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
        </div>
      ))}
    </div>
  )
}
