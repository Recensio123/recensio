'use client'

/*
 * A booking rule, presented as a short column of cards.
 *
 * Every one of these rules is a trade-off the salon should be able to weigh
 * without knowing the trade — so each option carries the consequence, not
 * just the label. A rookie owner picking "24 timmar" should be able to read
 * why that is a stricter promise than it sounds.
 *
 * Used both for the salon's own rules and for a single chair's override,
 * where the first card hands the decision back to the salon.
 */

export type Choice<T> = {
  value: T
  label: string
  desc:  string
}

export function PolicyChoice<T extends string | number | boolean | null>({
  choices, value, onPick, columns,
}: {
  choices: Choice<T>[]
  value:   T
  onPick:  (v: T) => void
  /** Two across for the short rules — a person's panel has less room. */
  columns?: boolean
}) {
  return (
    <div className={columns ? 'grid sm:grid-cols-2 gap-2' : 'space-y-2'}>
      {choices.map(c => {
        const active = c.value === value
        return (
          <button
            key={String(c.value)}
            onClick={() => onPick(c.value)}
            className={`w-full text-left p-4 rounded-xl border transition-colors ${
              active ? 'bg-mustard/10 border-mustard/50' : 'bg-navy-900 border-navy-700 hover:border-navy-500'
            }`}
          >
            <div className={`text-sm font-semibold ${active ? 'text-mustard' : 'text-white'}`}>
              {c.label}
            </div>
            <div className="text-slate-400 text-xs mt-1 leading-relaxed">{c.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

/**
 * A rule measured in hours, as one line instead of a column of cards.
 *
 * Five cards spelled out five consequences, which is generous the first time
 * and in the way every time after. A dial says the same thing in a sentence
 * that changes as you drag: the rookie still gets told what the choice means,
 * the owner who already knows just moves the handle.
 */
export function HourDial({ hours, max, onChange, label, hint }: {
  hours:  number
  max:    number
  onChange: (h: number) => void
  label:  (h: number) => string
  hint:   (h: number) => string
}) {
  const step = (n: number) => onChange(Math.min(max, Math.max(0, hours + n)))
  const btn = 'w-9 h-9 rounded-lg bg-navy-800 border border-navy-600 text-slate-300 hover:text-white hover:border-navy-500 text-lg leading-none disabled:opacity-30 disabled:hover:border-navy-600'

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => step(-1)} disabled={hours <= 0} className={btn} aria-label="−1">−</button>
        <span className="text-mustard text-sm font-semibold min-w-[9.5rem] text-center">
          {label(hours)}
        </span>
        <button onClick={() => step(1)} disabled={hours >= max} className={btn} aria-label="+1">+</button>

        <input
          type="range" min={0} max={max} step={1} value={hours}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 min-w-[120px] accent-yellow-500 cursor-pointer"
          aria-label={label(hours)}
        />
        <span className="text-slate-600 text-xs tabular-nums shrink-0">{max} h</span>
      </div>
      <p className="text-slate-400 text-xs mt-3 leading-relaxed">{hint(hours)}</p>
    </div>
  )
}

/* ── The two rules, in one vocabulary ──────────────────────────────────────
 *
 * The salon's settings and a person's override must never describe the same
 * rule in two different ways, so both read their wording from here.
 */

export type Lang = 'sv' | 'en'

export function leadLabel(mins: number, lang: Lang): string {
  if (mins === 0)    return lang === 'sv' ? 'Ända fram till tiden' : 'Right up to the appointment'
  if (mins === 1440) return lang === 'sv' ? 'Dagen innan'          : 'The day before'
  if (mins % 60 === 0) {
    const h = mins / 60
    if (lang === 'sv') return `${h} ${h === 1 ? 'timme' : 'timmar'} innan`
    return `${h} hour${h === 1 ? '' : 's'} before`
  }
  return lang === 'sv' ? `${mins} minuter innan` : `${mins} minutes before`
}

/* ── The two hour rules, as a dial ─────────────────────────────────────────
 *
 * The hint changes at the points where the rule changes meaning, not on
 * every hour — a salon reads "inget bokas samma dag" once and knows what 24
 * means. Wording stays close to the cards these replaced.
 */

export function leadDialLabel(h: number, lang: Lang): string {
  if (h === 0)  return lang === 'sv' ? 'Ända fram till tiden' : 'Right up to the time'
  if (h === 24) return lang === 'sv' ? 'Dagen innan'          : 'The day before'
  return leadLabel(h * 60, lang)
}

export function leadDialHint(h: number, lang: Lang): string {
  if (lang === 'sv') {
    if (h === 0)  return 'Kunden kan boka en lucka som börjar om tio minuter. Fyller sena hål, men du kan bli överraskad mitt i en behandling.'
    if (h <= 2)   return 'Räcker för att hinna se bokningen och förbereda. Behåller det mesta av spontanbokningarna.'
    if (h <= 5)   return 'Förmiddagen bokas inte samma morgon. Passar dig som planerar dagen i förväg.'
    if (h < 24)   return 'Bara tider senare på dagen går att boka. Dagens tidiga luckor fylls via telefon.'
    return 'Inget bokas samma dag online. Tryggast för planeringen — men dagens tomma luckor fylls bara via telefon.'
  }
  if (h === 0)  return 'A customer can take a slot starting ten minutes from now. Fills late gaps, but you can be surprised mid-treatment.'
  if (h <= 2)   return 'Enough time to see the booking and prepare. Keeps most walk-up bookings.'
  if (h <= 5)   return 'The morning is not booked the same morning. Suits a day planned in advance.'
  if (h < 24)   return 'Only later slots can be booked. Early gaps fill by phone.'
  return 'Nothing is booked online the same day. Safest for planning — but today\'s empty slots only fill by phone.'
}

export function cancelDialLabel(h: number, lang: Lang): string {
  if (h === 0) return lang === 'sv' ? 'När som helst' : 'Anytime'
  if (lang === 'sv') return `${h} ${h === 1 ? 'timme' : 'timmar'} innan`
  return `${h} hour${h === 1 ? '' : 's'} before`
}

export function cancelDialHint(h: number, lang: Lang): string {
  if (lang === 'sv') {
    if (h === 0)  return 'Kunden kan avboka ända fram till tiden. En ärlig avbokning ger dig chansen att fylla luckan — en spärrad blir ofta en utebliven kund.'
    if (h <= 12)  return 'Sena återbud stoppas, men en morgonavbokning för en eftermiddagstid går fortfarande.'
    if (h <= 24)  return 'Branschens vanligaste regel. Ger dig en hel dag att fylla luckan.'
    return 'För långa behandlingar som är svåra att boka om med kort varsel.'
  }
  if (h === 0)  return 'Customers can cancel right up to the appointment. An honest cancellation gives you a chance to refill the slot — a blocked one often becomes a no-show.'
  if (h <= 12)  return 'Stops last-minute cancellations, while a morning cancellation for an afternoon slot still works.'
  if (h <= 24)  return 'The most common rule in the trade. Gives you a full day to refill the gap.'
  return 'For long treatments that are hard to rebook on short notice.'
}

export function LEAD_CHOICES(lang: Lang): Choice<number>[] {
  return lang === 'sv' ? [
    { value: 0,    label: leadLabel(0, lang),    desc: 'Kunden kan boka en lucka som börjar om tio minuter. Fyller sena hål, men du kan bli överraskad mitt i en behandling.' },
    { value: 60,   label: leadLabel(60, lang),   desc: 'Räcker för att hinna se bokningen och förbereda. Behåller det mesta av spontanbokningarna.' },
    { value: 120,  label: leadLabel(120, lang),  desc: 'Dagens luckor går fortfarande att fylla, men aldrig i sista sekund.' },
    { value: 240,  label: leadLabel(240, lang),  desc: 'Förmiddagen bokas inte samma morgon. Passar dig som planerar dagen i förväg.' },
    { value: 1440, label: leadLabel(1440, lang), desc: 'Inget bokas samma dag online. Tryggast för planeringen — men dagens tomma luckor fylls bara via telefon.' },
  ] : [
    { value: 0,    label: leadLabel(0, lang),    desc: 'A customer can take a slot starting ten minutes from now. Fills late gaps, but you can be surprised mid-treatment.' },
    { value: 60,   label: leadLabel(60, lang),   desc: 'Enough time to see the booking and prepare. Keeps most walk-up bookings.' },
    { value: 120,  label: leadLabel(120, lang),  desc: 'Today\'s gaps still fill, but never at the last second.' },
    { value: 240,  label: leadLabel(240, lang),  desc: 'The morning is not booked the same morning. Suits a day planned in advance.' },
    { value: 1440, label: leadLabel(1440, lang), desc: 'Nothing is booked online the same day. Safest for planning — but today\'s empty slots only fill by phone.' },
  ]
}

export function AUTO_CHOICES(lang: Lang): Choice<boolean>[] {
  return lang === 'sv' ? [
    { value: true,  label: 'Godkänns automatiskt',
      desc: 'Är luckan ledig inom arbetstiden bokas tiden direkt och kunden får sin bokningsbekräftelse på en gång. Färre kunder hoppar av, och du slipper ett moment.' },
    { value: false, label: 'Du bekräftar först',
      desc: 'Bokningen hamnar som "Väntar" i listan. Bokningsbekräftelsen skickas först när du godkänt den. Ger dig kontrollen — men kunden lämnar sidan utan en säker tid, så bekräfta snabbt.' },
  ] : [
    { value: true,  label: 'Confirmed automatically',
      desc: 'If the slot is free inside working hours the time is booked and the customer gets the confirmation straight away. Fewer drop-offs, one less step for you.' },
    { value: false, label: 'You confirm first',
      desc: 'The booking lands as "Pending" in the list. The confirmation is only sent once you approve it. You keep control — but the customer leaves without a certain time, so confirm quickly.' },
  ]
}
