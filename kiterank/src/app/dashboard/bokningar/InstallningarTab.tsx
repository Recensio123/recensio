'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import {
  PolicyChoice, HourDial, AUTO_CHOICES,
  leadDialLabel, leadDialHint, cancelDialLabel, cancelDialHint,
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
    cancelTitle: 'Avbokning',
    cancelIntro: 'Hur nära inpå sin tid kan en kund avboka via sin avbokningslänk?',
    saved:       'Sparat — gäller direkt för alla bokningar.',
    note:        'Texten på bokningssidan uppdateras automatiskt så att kunden ser exakt vad som gäller.',
    perStaff:    'Gäller alla medarbetare som inte har en egen regel. Under Personal kan du ändra för en enskild person.',
  },
  en: {
    leadTitle:   'How close to the hour can a customer book?',
    leadIntro:   'Times closer than that stop showing as free. The customer is asked to call you instead.',
    autoTitle:   'Confirming new bookings',
    autoIntro:   'What happens when a customer books a free slot inside working hours?',
    cancelTitle: 'Cancellation',
    cancelIntro: 'How close to the appointment can a customer cancel through their link?',
    saved:       'Saved — applies immediately to all bookings.',
    note:        'The booking page wording updates automatically so customers see exactly what applies.',
    perStaff:    'Applies to every staff member without a rule of their own. Under Staff you can change it for a single person.',
  },
}

export function InstallningarTab({
  initialCancelHours, initialLeadMinutes, initialAutoConfirm,
}: {
  initialCancelHours: number
  initialLeadMinutes: number
  initialAutoConfirm: boolean
}) {
  const { lang } = useLang()
  const L = T[lang]

  const [hours, setHours] = useState(initialCancelHours)
  const [lead,  setLead]  = useState(Math.round(initialLeadMinutes / 60))
  const [auto,  setAuto]  = useState(initialAutoConfirm)
  /* Which rule was saved last — one green line under the rule the salon
   * actually touched beats a page-wide "saved" that says nothing. */
  const [saved, setSaved] = useState<'cancel' | 'lead' | 'auto' | null>(null)

  /* Always persisted — the example data elsewhere on the page is a display
   * matter, but a policy the salon picks must survive a reload. */
  async function save(field: string, value: number | boolean, which: 'cancel' | 'lead' | 'auto') {
    setSaved(null)
    const res = await fetch('/api/booking-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) setSaved(which)
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── How close to the hour ───────────────────────────────────────── */}
      <section>
        <h2 className="text-white font-semibold text-lg mb-1">{L.leadTitle}</h2>
        <p className="text-slate-400 text-sm mb-3">{L.leadIntro}</p>
        <HourDial
          hours={lead}
          max={24}
          onChange={h => { setLead(h); void save('lead_minutes', h * 60, 'lead') }}
          label={h => leadDialLabel(h, lang)}
          hint={h => leadDialHint(h, lang)}
        />
        {saved === 'lead' && <p className="text-green-400 text-xs mt-3">{L.saved}</p>}
        <p className="text-slate-500 text-xs mt-2">{L.perStaff}</p>
      </section>

      {/* ── Automatic or manual confirmation ────────────────────────────── */}
      <section className="pt-6 border-t border-navy-700">
        <h2 className="text-white font-semibold text-lg mb-1">{L.autoTitle}</h2>
        <p className="text-slate-400 text-sm mb-3">{L.autoIntro}</p>
        <PolicyChoice
          choices={AUTO_CHOICES(lang)}
          value={auto}
          onPick={v => { setAuto(v); void save('auto_confirm', v, 'auto') }}
        />
        {saved === 'auto' && <p className="text-green-400 text-xs mt-3">{L.saved}</p>}
        <p className="text-slate-500 text-xs mt-2">{L.perStaff}</p>
      </section>

      {/* ── Cancellation window ─────────────────────────────────────────── */}
      <section className="pt-6 border-t border-navy-700">
        <h2 className="text-white font-semibold text-lg mb-1">{L.cancelTitle}</h2>
        <p className="text-slate-400 text-sm mb-3">{L.cancelIntro}</p>
        {/* Up to two days: a colour or a full head is hard to refill on
            short notice, and 48 hours was worth keeping reachable. */}
        <HourDial
          hours={hours}
          max={48}
          onChange={h => { setHours(h); void save('cancel_hours', h, 'cancel') }}
          label={h => cancelDialLabel(h, lang)}
          hint={h => cancelDialHint(h, lang)}
        />
        {saved === 'cancel' && <p className="text-green-400 text-xs mt-3">{L.saved}</p>}
        <p className="text-slate-500 text-xs mt-2">{L.note}</p>
      </section>
    </div>
  )
}
