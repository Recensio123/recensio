'use client'
import { useCallback, useEffect, useState } from 'react'
import { OsparatRad, useOsparat } from '@/components/dashboard/Osparat'
import { KalenderSynk } from './KalenderSynk'
import { useLang } from '@/components/LanguageProvider'
import {
  PolicyChoice, HourDial, AUTO_CHOICES, BUFFER_CHOICES,
  leadDialLabel, leadDialHint, cancelDialLabel, cancelDialHint,
  bufferLabel, bufferHint, avslutLabel, avslutHint, hoppaLabel, hoppaHint,
} from './PolicyChoice'

/*
 * The salon's booking policy.
 *
 * Three decisions, in the order a customer meets them: how close to the hour
 * they may book, what happens the moment they press the button, and how late
 * they may still cancel.
 *
 * The two measured in hours are dials rather than lists of cards. A card per
 * option spelled out every consequence at once, which is a page of reading
 * for a rule that is one number — and it pushed the third decision below the
 * fold. The dial keeps the explanation, but only for the value chosen.
 */

const T = {
  sv: {
    leadTitle:   'Hur nära inpå kan en kund boka?',
    leadIntro:   'Tider närmare än så visas inte som lediga. Kunden hänvisas till att ringa dig.',
    autoTitle:   'Bekräftelse av nya bokningar',
    autoIntro:   'Vad händer när en kund bokar en ledig lucka inom arbetstiden?',
    doneTitle:   'Avslut av genomförda besök',
    doneIntro:   'Besök stängs automatiskt. Hur länge ska systemet vänta efter sluttiden?',
    doneNote:    'Ligger det en omdömesfråga och väntar stannar bokningen kvar under Kommande tills den gått ut — eller tills du stoppat den där. Det är med flit. Kunden som klagade i stolen ska inte hinna få en vänlig fråga om att sätta betyg innan du sett den.',
    remTitle:    'Påminnelse vid sent bokade tider',
    remIntro:    'En kund som bokar strax innan sin tid har nyss fått en bekräftelse. Ska de få en påminnelse också?',
    remNote:     'Hur långt före tiden påminnelsen går ut för alla andra ställer du under Meddelanden, tillsammans med texten.',
    cancelTitle: 'Hur nära inpå sin tid kan en kund avboka?',
    buffTitle:   'Städtid mellan bokningar',
    buffIntro:   'Ska kalendern lämna en lucka efter varje besök?',
    failed:      'Kunde inte spara. Försök igen.',
    perStaff:    'Gäller alla medarbetare som inte har en egen regel. Under Personal kan du ändra för en enskild person.',
  },
  en: {
    leadTitle:   'How close to the hour can a customer book?',
    leadIntro:   'Times closer than that stop showing as free. The customer is asked to call you instead.',
    autoTitle:   'Confirming new bookings',
    autoIntro:   'What happens when a customer books a free slot inside working hours?',
    doneTitle:   'Closing finished appointments',
    doneIntro:   'Visits close automatically. How long should the system wait after the end time?',
    doneNote:    'If a review request is still queued, the booking stays under Upcoming until it goes out — or until you stop it there. That is deliberate. The customer who complained in the chair should not get a cheerful request for a rating before you have seen it.',
    remTitle:    'Reminders for late bookings',
    remIntro:    'A customer booking shortly before their time has just had a confirmation. Should they get a reminder too?',
    remNote:     'How far ahead the reminder goes out for everyone else is set under Messages, along with its wording.',
    cancelTitle: 'How close to the appointment can a customer cancel?',
    buffTitle:   'Turnaround between bookings',
    buffIntro:   'Should the calendar leave a gap after every visit?',
    failed:      'Could not save. Try again.',
    perStaff:    'Applies to every staff member without a rule of their own. Under Staff you can change it for a single person.',
  },
}

export function InstallningarTab({
  initialCancelHours, initialLeadMinutes, initialAutoConfirm,
  initialAutoCompleteHours = 1, initialReminderSkipHours = 4,
  initialBufferMinutes = 0,
}: {
  initialCancelHours: number
  initialLeadMinutes: number
  initialAutoConfirm: boolean
  /** Timmar efter sluttid innan besöket stängs. Noll = direkt. */
  initialAutoCompleteHours?: number
  /** Bokningar gjorda närmare tiden än så får ingen påminnelse. */
  initialReminderSkipHours?: number
  /** Städtid mellan bokningar. Noll = avstängd. */
  initialBufferMinutes?: number
}) {
  const { lang } = useLang()
  const L = T[lang]

  /*
   * Ingenting sparas förrän salongen säger till.
   *
   * Reglerna här gäller varje bokning som görs efteråt, och ett felklick på en
   * ratt är svårt att upptäcka och lätt att göra. Ändringarna samlas därför i
   * ett utkast, raden högst upp säger att något väntar, och ett försök att
   * lämna sidan frågar först.
   */
  const [läst,   setLäst]   = useState({
    hours: initialCancelHours,
    lead:  Math.round(initialLeadMinutes / 60),
    auto:  initialAutoConfirm,
    klar:  initialAutoCompleteHours,
    hoppa: initialReminderSkipHours,
    buff:  initialBufferMinutes,
  })
  const [utkast, setUtkast] = useState<Partial<typeof läst>>({})
  const [sparar, setSparar] = useState(false)
  const [sparad, setSparad] = useState(false)
  const [fel,    setFel]    = useState('')

  /* Hämtningen och tillämpningen ligger isär, så att effekten sätter state i en
     callback och inte i sin egen kropp — och så att ett svar som kommer efter
     att fliken lämnats inte skriver i state som inte längre finns. */
  const hämta = useCallback(async () => {
    const res = await fetch('/api/booking-settings')
    if (!res.ok) throw new Error(String(res.status))
    return res.json()
  }, [])

  const tillämpa = useCallback((d: Record<string, unknown>) => {
    setLäst({
      hours: Number(d.cancel_hours ?? initialCancelHours),
      lead:  Math.round(Number(d.lead_minutes ?? initialLeadMinutes) / 60),
      auto:  Boolean(d.auto_confirm ?? initialAutoConfirm),
      klar:  Number(d.auto_complete_hours ?? initialAutoCompleteHours),
      hoppa: Number(d.reminder_skip_hours ?? initialReminderSkipHours),
      buff:  Number(d.buffer_minutes ?? initialBufferMinutes),
    })
    setUtkast({})
  }, [initialCancelHours, initialLeadMinutes, initialAutoConfirm,
      initialAutoCompleteHours, initialReminderSkipHours, initialBufferMinutes])

  useEffect(() => {
    let aktiv = true
    hämta()
      .then(d => { if (aktiv) tillämpa(d) })
      .catch(() => {})
    return () => { aktiv = false }
  }, [hämta, tillämpa])

  const v = { ...läst, ...utkast }
  const ändrat = {
    lead:   v.lead   !== läst.lead,
    auto:   v.auto   !== läst.auto,
    klar:   v.klar   !== läst.klar,
    hoppa:  v.hoppa  !== läst.hoppa,
    hours:  v.hours  !== läst.hours,
    buff:   v.buff   !== läst.buff,
  }
  const osparat = Object.values(ändrat).some(Boolean)

  useOsparat({ osparat, sparar, sparad, fel, spara })

  const sätt = (d: Partial<typeof läst>) => { setSparad(false); setUtkast(u => ({ ...u, ...d })) }

  async function spara() {
    setSparar(true); setFel('')
    try {
      const patch: Record<string, unknown> = {}
      if (ändrat.lead)  patch.lead_minutes = v.lead * 60
      if (ändrat.auto)  patch.auto_confirm = v.auto
      if (ändrat.klar)  patch.auto_complete_hours = v.klar
      if (ändrat.hoppa) patch.reminder_skip_hours = v.hoppa
      if (ändrat.hours) patch.cancel_hours = v.hours
      if (ändrat.buff)  patch.buffer_minutes = v.buff

      const res = await fetch('/api/booking-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(String(res.status))

      tillämpa(await hämta())
      setSparad(true)
      setTimeout(() => setSparad(false), 3000)
    } catch {
      setFel(L.failed)
    } finally {
      setSparar(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* ── How close to the hour ───────────────────────────────────────── */}
      <section>
        <h2 className="text-white font-semibold text-base mb-1">{L.leadTitle}</h2>
        <p className="text-slate-400 text-xs mb-2.5">{L.leadIntro}</p>
        <HourDial
          hours={v.lead}
          max={24}
          onChange={h => sätt({ lead: h })}
          label={h => leadDialLabel(h, lang)}
          hint={h => leadDialHint(h, lang)}
        />
        <p className="text-slate-500 text-xs mt-2">{L.perStaff}</p>
      </section>

      {/* ── Automatic or manual confirmation ────────────────────────────── */}
      <section className="pt-5 border-t border-navy-700">
        <h2 className="text-white font-semibold text-base mb-1">{L.autoTitle}</h2>
        <p className="text-slate-400 text-xs mb-2.5">{L.autoIntro}</p>
        <PolicyChoice
          choices={AUTO_CHOICES(lang)}
          value={v.auto}
          onPick={x => sätt({ auto: x })}
        />
        <p className="text-slate-500 text-xs mt-2">{L.perStaff}</p>
      </section>

      {/* ── Marginalen innan besöket stängs ─────────────────────────────── */}
      <section className="pt-5 border-t border-navy-700">
        <h2 className="text-white font-semibold text-base mb-1">{L.doneTitle}</h2>
        <p className="text-slate-400 text-xs mb-2.5">{L.doneIntro}</p>
        <HourDial
          hours={v.klar}
          max={24}
          onChange={h => sätt({ klar: h })}
          label={h => avslutLabel(h, lang)}
          hint={h => avslutHint(h, lang)}
        />
        <p className="text-slate-500 text-xs mt-2">{L.doneNote}</p>
      </section>

      {/* ── Påminnelse vid sent bokade tider ────────────────────────────── */}
      <section className="pt-5 border-t border-navy-700">
        <h2 className="text-white font-semibold text-base mb-1">{L.remTitle}</h2>
        <p className="text-slate-400 text-xs mb-2.5">{L.remIntro}</p>
        <HourDial
          hours={v.hoppa}
          max={24}
          onChange={h => sätt({ hoppa: h })}
          label={h => hoppaLabel(h, lang)}
          hint={h => hoppaHint(h, lang)}
        />
        <p className="text-slate-500 text-xs mt-2">{L.remNote}</p>
      </section>

      {/* ── Cancellation window ─────────────────────────────────────────── */}
      <section className="pt-5 border-t border-navy-700">
        <h2 className="text-white font-semibold text-base mb-2">{L.cancelTitle}</h2>
        {/* Upp till två dygn: en färgning eller en uppsättning är svår att
            fylla med kort varsel, och 48 timmar var värt att nå. Ratten bär
            själv förklaringen till det valda värdet, så avsnittet behöver
            varken en underrubrik som upprepar rubriken eller en stående not
            om att kundens sida följer med. */}
        <HourDial
          hours={v.hours}
          max={48}
          onChange={h => sätt({ hours: h })}
          label={h => cancelDialLabel(h, lang)}
          hint={h => cancelDialHint(h, lang)}
        />
      </section>

      {/* ── Städtid mellan bokningar ────────────────────────────────────── */}
      <section className="pt-5 border-t border-navy-700">
        <h2 className="text-white font-semibold text-base mb-1">{L.buffTitle}</h2>
        <p className="text-slate-400 text-xs mb-2.5">{L.buffIntro}</p>
        <PolicyChoice
          choices={BUFFER_CHOICES(lang)}
          value={v.buff > 0}
          /* Femton minuter när den slås på: tillräckligt för att torka av och
             sopa, och det värde en salong oftast landar på ändå. Slås den av
             blir det noll, inte ett dolt minne av vad som stod förut — en
             avstängd regel ska vara avstängd och inte ligga och vänta. */
          onPick={på => sätt({ buff: på ? (v.buff || 15) : 0 })}
        />
        {/* Ratten först när regeln är på. En siffra att ställa in för något som
            är avstängt är en fråga utan följd. */}
        {v.buff > 0 && (
          <div className="mt-2">
            <HourDial
              hours={v.buff}
              max={60}
              steg={5}
              maxEtikett="60 min"
              onChange={m => sätt({ buff: m })}
              label={m => bufferLabel(m, lang)}
              hint={m => bufferHint(m, lang)}
            />
          </div>
        )}
      </section>

      {/* Kalendersynken sparar inget av sig själv — adresserna finns redan
          och knapparna verkar direkt. Den ligger därför utanför utkastet och
          efter de fyra reglerna. */}
      <KalenderSynk />

      <OsparatRad osparat={osparat} sparar={sparar} sparad={sparad} fel={fel} spara={spara} />

    </div>
  )
}
