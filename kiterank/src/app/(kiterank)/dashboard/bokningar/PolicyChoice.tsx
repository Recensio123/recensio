'use client'

/*
 * En bokningsregel, som en rad att kryssa i.
 *
 * Var tidigare ett kort per alternativ med hela konsekvensen utskriven i
 * båda. Två sådana regler och två rattar fyllde en hel skärm med text som
 * mestadels beskrev det man just valt bort — och den som ska ändra en enda
 * inställning fick skrolla förbi allting annat för att hitta den.
 *
 * Nu står alternativen som rader med en markering, och förklaringen visas
 * bara för det valda. Samma grepp som ratten redan använder: nybörjaren får
 * fortfarande veta vad valet innebär, den som redan vet ser en kort lista.
 *
 * Används både för salongens egna regler och för en enskild stols undantag,
 * där första raden lämnar tillbaka beslutet till salongen.
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
  /** Två i bredd för de korta reglerna — en persons panel har mindre plats. */
  columns?: boolean
}) {
  return (
    <div className={columns ? 'grid sm:grid-cols-2 gap-1.5' : 'space-y-1.5'}>
      {choices.map(c => {
        const active = c.value === value
        return (
          <button
            key={String(c.value)}
            onClick={() => onPick(c.value)}
            role="radio"
            aria-checked={active}
            className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-colors ${
              active ? 'bg-mustard/10 border-mustard/50' : 'bg-navy-900 border-navy-700 hover:border-navy-500'
            }`}
          >
            {/* Markeringen sitter i egen kolumn så att texten radbryts under sig
                själv och inte under pricken. */}
            <span
              className={`shrink-0 mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                active ? 'border-mustard' : 'border-navy-500'
              }`}
            >
              {active && <span className="w-2 h-2 rounded-full bg-mustard" />}
            </span>

            <span className="min-w-0">
              <span className={`block text-sm font-semibold ${active ? 'text-mustard' : 'text-slate-300'}`}>
                {c.label}
              </span>
              {/* Bara för det valda. Konsekvensen av det man inte valt är text
                  som ska läsas en gång, inte varje gång sidan öppnas. */}
              {active && (
                <span className="block text-slate-400 text-xs mt-1 leading-relaxed">{c.desc}</span>
              )}
            </span>
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
export function HourDial({ hours, max, onChange, label, hint, steg = 1, maxEtikett }: {
  hours:  number
  max:    number
  onChange: (h: number) => void
  label:  (h: number) => string
  hint:   (h: number) => string
  /* Steglängd och etikett så samma ratt kan mäta minuter.
     Städtiden rör sig i femminuterssteg — ingen salong städar i sjutton
     minuter, och ett reglage som stannar på varje minut är sextio lägen att
     leta i för att hitta femton. */
  steg?:       number
  maxEtikett?: string
}) {
  const flytta = (n: number) => onChange(Math.min(max, Math.max(0, hours + n * steg)))
  const btn = 'w-8 h-8 rounded-lg bg-navy-800 border border-navy-600 text-slate-300 hover:text-white hover:border-navy-500 text-lg leading-none disabled:opacity-30 disabled:hover:border-navy-600'

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl p-3">
      <div className="flex items-center gap-3">
        <button onClick={() => flytta(-1)} disabled={hours <= 0} className={btn} aria-label="−">−</button>
        <span className="text-mustard text-sm font-semibold min-w-[8.5rem] text-center">
          {label(hours)}
        </span>
        <button onClick={() => flytta(1)} disabled={hours >= max} className={btn} aria-label="+">+</button>

        <input
          type="range" min={0} max={max} step={steg} value={hours}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 min-w-[120px] accent-yellow-500 cursor-pointer"
          aria-label={label(hours)}
        />
        <span className="text-slate-600 text-xs tabular-nums shrink-0">{maxEtikett ?? `${max} h`}</span>
      </div>
      <p className="text-slate-400 text-xs mt-2 leading-relaxed">{hint(hours)}</p>
    </div>
  )
}

/* ── Städtiden ──────────────────────────────────────────────────────────── */

export function bufferLabel(m: number, lang: Lang): string {
  if (m === 0) return lang === 'sv' ? 'Ingen städtid' : 'No turnaround'
  return lang === 'sv' ? `${m} minuter` : `${m} minutes`
}

/*
 * Vad städtiden gör, sagt en gång.
 *
 * Inte en förklaring per värde. Avvägningen är densamma vid fem minuter som vid
 * trettio: varje minut är en minut stolen inte säljer, och noll minuter är en
 * dag som glider. Den som förstått den kan välja siffran själv.
 */
export function bufferHint(m: number, lang: Lang): string {
  if (lang === 'sv') {
    if (m === 0) {
      return 'Nästa kund kan boka minuten efter att den förra rest sig. Ger flest tider i kalendern — och den som behöver torka av stolen gör det på nästa kunds tid.'
    }
    return 'Läggs efter varje bokning. Spärras i kalendern, men syns aldrig för kunden och ingår inte i priset — de ser sin behandlingstid som vanligt. Räkna med att varje minut här är en minut färre att sälja per dag.'
  }
  if (m === 0) {
    return 'The next customer can book the minute the last one stands up. Gives the most slots — and whoever wipes down the chair does it on the next customer\'s time.'
  }
  return 'Added after every booking. Blocked in the calendar, never shown to the customer and not part of the price — they see their treatment time as usual. Every minute here is a minute less to sell each day.'
}

export function BUFFER_CHOICES(lang: Lang): Choice<boolean>[] {
  return lang === 'sv' ? [
    { value: false, label: 'Ingen städtid',
      desc: 'Bokningarna läggs direkt efter varandra. Flest tider i kalendern, och den som behöver ställa i ordning gör det på nästa kunds tid.' },
    { value: true,  label: 'Städtid mellan varje bokning',
      desc: 'Kalendern lämnar en lucka efter varje besök så att stolen hinner göras i ordning. Kunden ser bara sin behandlingstid.' },
  ] : [
    { value: false, label: 'No turnaround time',
      desc: 'Bookings sit back to back. The most slots in the calendar, and whoever resets the chair does it on the next customer\'s time.' },
    { value: true,  label: 'Turnaround between bookings',
      desc: 'The calendar leaves a gap after every visit so the chair can be reset. The customer only ever sees their treatment time.' },
  ]
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

/*
 * Vad avbokningsgränsen gör, sagt en gång.
 *
 * Löd tidigare olika för varje värde, vilket lät som fyra separata råd om vad
 * salongen borde välja. Det de behöver veta är i stället vad reglaget styr och
 * åt vilket håll det lutar — den avvägningen är densamma vid 0 som vid 48
 * timmar, och den som förstått den kan välja själv.
 */
export function cancelDialHint(_h: number, lang: Lang): string {
  return lang === 'sv'
    ? 'Gränsen styr avbokningsknappen i kundens bekräftelse. Efter den är knappen låst och kunden får ringa dig i stället. Sätt den tidigt så får du planeringsro; sätt den sent så får du fler återbud i tid — och en lucka du hinner fylla är bättre än en tom stol.'
    : 'The limit controls the cancel button in the customer\'s confirmation. Past it the button is locked and they have to call you instead. Set it early for a settled schedule; set it late and more customers cancel in time — and a gap you can still fill beats an empty chair.'
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

/*
 * Marginalen innan ett besök stängs av sig självt.
 *
 * Alltid automatiskt — ingen salong vill kryssa av gårdagens besök, och den
 * som glömde fick tidigare en lista som växte tills omdömesfrågorna slutade gå
 * ut. Kvar att bestämma är väntetiden, och den har två skäl: behandlingen som
 * drar över, och chansen att hinna markera ett uteblivet besök innan kunden
 * får frågan om ett omdöme.
 */
export function avslutLabel(h: number, lang: Lang): string {
  if (h === 0) return lang === 'sv' ? 'Direkt när tiden är slut' : 'As soon as the time is up'
  if (h === 1) return lang === 'sv' ? '1 timme efter' : '1 hour after'
  return lang === 'sv' ? `${h} timmar efter` : `${h} hours after`
}

export function avslutHint(h: number, lang: Lang): string {
  if (lang === 'sv') {
    if (h === 0) return 'Besöket räknas som genomfört i samma stund behandlingstiden passerat. Omdömesfrågan börjar räkna direkt.'
    return `Besöket stängs ${h === 1 ? 'en timme' : `${h} timmar`} efter sluttiden. Marginalen räcker för en behandling som drar över, och du hinner markera ett uteblivet besök innan omdömesfrågan går.`
  }
  if (h === 0) return 'The visit counts as done the moment the appointment time passes. The review request starts counting immediately.'
  return `The visit closes ${h === 1 ? 'an hour' : `${h} hours`} after the end time. Enough margin for an appointment that runs over, and time to mark a no-show before the review request goes out.`
}

/*
 * När en bokning är gjord för sent för att påminnas om.
 *
 * Gränsen mäts från när bokningen gjordes, inte från nu. Den som bokar på
 * morgonen för samma eftermiddag har redan fått en bekräftelse i handen, och
 * en påminnelse en timme senare läser som ett fel i systemet — dessutom kostar
 * den ett SMS.
 */
export function hoppaLabel(h: number, lang: Lang): string {
  if (h === 0) return lang === 'sv' ? 'Alltid påminnelse' : 'Always remind'
  if (h === 1) return lang === 'sv' ? 'Inte inom 1 timme' : 'Not within 1 hour'
  return lang === 'sv' ? `Inte inom ${h} timmar` : `Not within ${h} hours`
}

export function hoppaHint(h: number, lang: Lang): string {
  if (lang === 'sv') {
    if (h === 0) return 'Alla kunder får en påminnelse, även den som bokar en timme innan. Räkna med att bekräftelsen och påminnelsen då kommer tätt inpå varandra.'
    return `Bokas tiden mindre än ${h === 1 ? 'en timme' : `${h} timmar`} i förväg skickas ingen påminnelse — kunden har nyss fått sin bekräftelse. Övriga påminns som vanligt.`
  }
  if (h === 0) return 'Every customer gets a reminder, even one booking an hour ahead. Expect the confirmation and the reminder to arrive close together.'
  return `If the time is booked less than ${h === 1 ? 'an hour' : `${h} hours`} in advance, no reminder is sent — the customer just got their confirmation. Everyone else is reminded as usual.`
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
