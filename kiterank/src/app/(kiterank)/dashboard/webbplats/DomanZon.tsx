'use client'
import { useCallback, useEffect, useState } from 'react'
import { helpTxt, Btn, CopyRad, gridStyle, Notis } from './domanUI'
import { registrarFor } from '@/lib/registrars'
import type { DomainRow } from './domanTypes'

/*
 * Namnserverläget: kunden lämnar över DNS, vi sköter resten.
 *
 * Ett fält att ändra hos domänleverantören i stället för fyra poster, och sedan
 * behöver de aldrig gå tillbaka dit — hemsida, mail och certifikat sätts
 * härifrån. Men bytet släcker deras gamla zon i samma stund, så ordningen är
 * inte förhandlingsbar:
 *
 *   1. Vi läser av vad som ligger på domänen idag
 *   2. Kunden ser vad vi hittade, mailen särskilt utpekad
 *   3. Först då lämnas namnservrarna ut
 *
 * Steg 2 finns för att en salong med fungerande mail ska förstå vad som händer
 * innan det händer, inte efteråt.
 */

type Läge = { steg: 'ny' | 'avläst' | 'väntar' | 'klar' }

type Avläsning = {
  hasMail:   boolean
  records:   number
  mx:        string[]
  registrar: { name: string; path: string } | null
}

const POLL_MS = 30_000

export function DomanZon({ row, onChange }: { row: DomainRow; onChange: () => void }) {
  const [läst,   setLäst]   = useState<Avläsning | null>(null)
  const [busy,   setBusy]   = useState(false)
  const [fel,    setFel]    = useState('')
  const [status, setStatus] = useState('')

  const steg: Läge['steg'] =
    row.verified_at            ? 'klar'
    : row.nameservers?.length  ? 'väntar'
    : row.imported_at          ? 'avläst'
    : 'ny'

  /* Leverantören känns igen på de namnservrar som stod där när vi läste av. */
  const vägen = registrarFor(row.imported_zone?.nameservers ?? [])?.path ?? ''

  async function call(action: string) {
    setBusy(true); setFel('')
    try {
      const res  = await fetch('/api/domains/zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: row.domain, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.error) {
        setFel(
          data.error === 'not_configured' ? T.notReady
          : data.error === 'not_read'     ? T.mustRead
          : data.message                  || T.failed,
        )
        return null
      }
      return data
    } finally {
      setBusy(false)
    }
  }

  async function read() {
    const d = await call('read')
    if (d) { setLäst(d); onChange() }
  }

  async function delegate() {
    const d = await call('delegate')
    if (d) onChange()
  }

  /* Statusen frågas av sig själv medan kunden byter hos sin leverantör. Ett byte
     slår igenom när det slår igenom; en knapp att trycka på i väntan hjälper
     ingen. */
  const poll = useCallback(async () => {
    if (!row.nameservers?.length || row.verified_at) return
    const res  = await fetch('/api/domains/zone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: row.domain, action: 'status' }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.ok) { onChange(); return }
    setStatus(data.status === 'host_failed' ? T.hostFailed : '')
  }, [row.domain, row.nameservers, row.verified_at, onChange])

  useEffect(() => {
    if (steg !== 'väntar') return
    /* Första frågan läggs efter renderingen och inte i den, så svaret inte
       skriver state mitt i en pågående rendering. */
    const first = setTimeout(() => void poll(), 0)
    const id    = setInterval(() => void poll(), POLL_MS)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [steg, poll])

  /* ── 1. Läs av zonen ────────────────────────────────────────────────── */
  if (steg === 'ny') {
    return (
      <>
        <p style={helpTxt}>{T.readWhy}</p>
        <Btn onClick={() => void read()} disabled={busy}>{busy ? T.reading : T.read}</Btn>
        {fel && <p style={{ ...helpTxt, color: '#f87171' }}>{fel}</p>}
      </>
    )
  }

  /* ── 2. Vad vi hittade ──────────────────────────────────────────────── */
  if (steg === 'avläst') {
    const a = läst
    return (
      <>
        {a?.hasMail ? (
          <Notis tone="warn">
            <strong>{T.mailFound}</strong><br />
            {a.mx.join(', ')}<br />
            {T.mailKept}
          </Notis>
        ) : (
          <Notis tone="info">{T.noMailFound}</Notis>
        )}

        {a && <p style={helpTxt}>{T.foundCount(a.records)}</p>}
        <p style={helpTxt}>{T.unknownSubs}</p>

        <Btn onClick={() => void delegate()} disabled={busy}>
          {busy ? T.preparing : T.prepare}
        </Btn>
        {fel && <p style={{ ...helpTxt, color: '#f87171' }}>{fel}</p>}
      </>
    )
  }

  /* ── 3. Namnservrarna, och väntan ───────────────────────────────────── */
  if (steg === 'väntar') {
    return (
      <>
        <p style={helpTxt}>{T.swapWhere}</p>
        {/* Vägen till fältet hos deras egen leverantör. Räknas ut ur zonen vi
            läste av, så den finns kvar efter en omladdning. */}
        {vägen && <p style={{ ...helpTxt, color: '#cbd5e1' }}>{vägen}</p>}

        <div style={gridStyle}>
          {row.nameservers!.map((ns, i) => (
            <CopyRad key={ns} label={`Namnserver ${i + 1}`} value={ns} />
          ))}
        </div>

        <Notis tone="warn">{T.replaceAll}</Notis>
        <p style={helpTxt}>{T.autoPoll}</p>
        {status && <p style={{ ...helpTxt, color: '#f87171' }}>{status}</p>}
      </>
    )
  }

  /* ── 4. Klart ───────────────────────────────────────────────────────── */
  return <Notis tone="ok">{T.done}</Notis>
}

const T = {
  readWhy:    'Vi börjar med att titta på vad som redan ligger på domänen, så inget försvinner när vi tar över. Ingenting ändras av det här steget.',
  read:       'Titta på domänen',
  reading:    'Läser…',

  mailFound:  'Du har mail på den här domänen idag.',
  mailKept:   'Vi tar med de posterna, så mailen fortsätter fram till samma leverantör som nu. Inget i din inkorg påverkas.',
  noMailFound:'Ingen mail ligger på domänen idag. Du kan lägga till mail här efteråt.',
  foundCount: (n: number) => `${n} poster lästes av och följer med.`,
  unknownSubs:'Har du en underdomän vi inte kan se — något utöver www, mail och shop — hör av dig innan du byter, så lägger vi in den för hand.',

  prepare:    'Fortsätt',
  preparing:  'Förbereder…',

  swapWhere:  'Byt namnservrarna hos din domänleverantör till dessa två:',
  replaceAll: 'Ersätt de namnservrar som står där nu — lägg inte till dessa vid sidan av dem.',
  autoPoll:   'Bytet slår igenom inom några minuter till ett dygn. Vi märker det själva och gör klart resten.',

  done:       'Klart. Sidan ligger på din domän, certifikatet är utfärdat, och Google får ta med den.',

  notReady:   'Domänkopplingen är inte påslagen ännu.',
  mustRead:   'Vi måste titta på domänen först.',
  hostFailed: 'Namnservrarna pekar rätt, men sista steget hos servern gick inte igenom. Vi tittar på det — hör av dig om det står kvar.',
  failed:     'Något gick fel. Försök igen.',
}
