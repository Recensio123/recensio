'use client'
import { useCallback, useEffect, useState } from 'react'
import { F, inputStyle } from './fields'
import { normaliseDomain } from '@/lib/domainTarget'
import { helpTxt, boxStyle, Btn, netimSök, länkTxt } from './domanUI'
import { DomanZon } from './DomanZon'
import { DomanMail } from './DomanMail'
import { DomanGuide } from './DomanGuide'
import type { DomainRow } from './domanTypes'

/*
 * Koppla din egen domän.
 *
 * Sidan bor på kiterank.se/s/<adress> från dagen den finns, men den adressen är
 * tillfällig: den syns inte på Google. Det är den här rutan som gör sidan till
 * salongens egen — och därför står konsekvensen i klartext i stället för att
 * gömmas i en hjälptext.
 *
 * En väg att koppla: kunden byter namnservrar till oss, och därefter är hemsida,
 * mail och certifikat vår sak. Det fanns tidigare en andra väg där kunden
 * behöll sin DNS och lade in en post själv, och den är borttagen med flit.
 * Den vägen kunde sluta med en salong vars besökare möttes av "din anslutning
 * är inte privat" — en sida som ser hackad ut är sämre än ingen sida alls, och
 * ett felläge vi hjälper kunden ur är fortfarande ett felläge vi valt att ha.
 */

export function DomanFalt({ namn }: { namn?: string }) {
  const [rader,  setRader]  = useState<DomainRow[]>([])
  const [zoner,  setZoner]  = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [value,  setValue]  = useState('')
  const [busy,   setBusy]   = useState<'add' | string | null>(null)
  const [error,  setError]  = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/domains')
      if (!res.ok) return
      const data = await res.json()
      setRader(data.domains ?? [])
      setZoner(Boolean(data.zones))
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function add() {
    const domain = normaliseDomain(value)
    setError(''); setBusy('add')
    try {
      const res  = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error === 'taken' ? T.taken : data.error === 'invalid' ? T.invalid : T.failed)
        return
      }
      setValue('')
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function remove(domain: string) {
    setBusy(domain)
    try {
      await fetch(`/api/domains?domain=${encodeURIComponent(domain)}`, { method: 'DELETE' })
      await load()
    } finally {
      setBusy(null)
    }
  }

  if (!loaded) return null

  /* Ingen egen rubrik och ingen avdelare här: rutan bor i en egen sektion i
     panelen, och sektionen har redan skrivit ut vad det här är. */
  return (
    <>
      {rader.length === 0 && (
        <>
          <p style={helpTxt}>{T.why}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={value}
              onChange={e => { setValue(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && value.trim()) void add() }}
              placeholder={T.placeholder}
              style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            />
            <Btn onClick={() => void add()} disabled={!value.trim() || busy === 'add'}>
              {busy === 'add' ? T.adding : T.add}
            </Btn>
          </div>
          {error && <p style={{ ...helpTxt, color: '#f87171' }}>{error}</p>}
          {/* Namnet på leverantören är länken. En rekommendation som kräver
              att kunden själv googlar fram var man köper är ingen hjälp. */}
          <p style={helpTxt}>
            {T.buy}
            <a href={netimSök(namn)} target="_blank" rel="noopener noreferrer" style={länkTxt}>Netim</a>
            {T.buyEfter}
          </p>
          {/* Domänhandlare säljer tillägg i kassan som den här kunden redan
              har. Certifikatet utfärdas av servern, zonen håller vi — köper de
              det en gång till får de inget för pengarna och kan inte ens
              använda det de betalat för. */}
          <p style={helpTxt}>{T.utan}</p>
          <p style={helpTxt}>{T.mail}</p>
          {/* Den som aldrig köpt en domän vet inte att det är enkelt. Guiden
              står här och inte i en hjälpsida, eftersom det är här de fastnar. */}
          <DomanGuide namn={namn} />
        </>
      )}

      {rader.map(row => (
          <div key={row.domain} style={boxStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontFamily: F }}>{row.domain}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap',
                background: row.verified_at ? 'rgba(74,222,128,0.12)' : '#1e293b',
                color:      row.verified_at ? '#4ade80' : '#94a3b8',
              }}>
                {row.verified_at ? '✓' : T.pending}
              </span>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => void remove(row.domain)}
                disabled={busy === row.domain}
                style={{
                  fontSize: 12, color: '#94a3b8', background: 'none', border: 'none',
                  cursor: 'pointer', textDecoration: 'underline', fontFamily: F, padding: 0,
                }}
              >
                {T.remove}
              </button>
            </div>

            {/* Vad kunden går in i. Stod tidigare på valkortet; valet är borta
                men beskedet behövs fortfarande innan första steget. */}
            {zoner && !row.verified_at && <p style={helpTxt}>{T.hur}</p>}

            {zoner
              ? <DomanZon row={row} onChange={() => void load()} />
              : <p style={helpTxt}>{T.notReady}</p>}

            {/* Mailen kan bara sättas när vi håller zonen. Läget frågas efter
                och inte bara verifieringen, för en domän kopplad på den gamla
                vägen har sin DNS kvar hos kunden — där kan vi inte skriva. */}
            {row.mode === 'nameservers' && row.verified_at && (
              <>
                <div style={{ height: 1, background: '#1e293b' }} />
                <DomanMail row={row} onChange={() => void load()} />
              </>
            )}
          </div>
      ))}
    </>
  )
}

const T = {
  /* Ordet "domän" förklaras genom ett exempel och inte genom en definition.
     Den som inte kan ordet känner ändå igen adressen på sitt eget visitkort,
     och har lärt sig ordet när meningen är slut. */
  why:        'Din sida syns på Google när den har en egen adress — en domän, till exempel salongen.se eller salongen.com. Det är den du säger i telefon och som står på visitkortet. Fram till dess fungerar sidan som vanligt, bokningsbar och delbar, men vi ber inte Google att ta med den.',
  /* Netim och inte de svenska webbhotellen: de säljer hemsidepaket, och en
     salong som just fått sin sida av oss ska inte mötas av ett erbjudande om
     en till i kassan. Priset står inte här; det ändras och skulle bli fel i
     panelen den dag det gör det. */
  buy:        'Har du ingen domän köper du den hos en domänleverantör. Vi rekommenderar ',
  buyEfter:   '. Domänen är din, och du behåller den även om du slutar hos oss.',
  utan:       'Du behöver inget SSL-certifikat, premium-DNS eller domänskydd. Certifikatet ingår och förnyas automatiskt, och DNS sköter vi åt dig.',
  /* Mailen nämns här men avgörs inte här. Sista meningen finns för att en
     salong annars kan köpa en brevlåda hos Netim som de hade fått gratis av
     oss som vidarebefordran så fort domänen är kopplad. */
  mail:       'Vill du ha en mejladress på din domän går det att köpa hos Netim, men de flesta använder Gmail. Mailen ställer du in här när domänen är kopplad.',
  add:        'Lägg till',
  adding:     'Lägger till…',
  placeholder:'salongen.se',
  invalid:    'Skriv domänen utan https:// och utan snedstreck, till exempel salongen.se',
  taken:      'Den domänen är redan kopplad till ett annat konto.',
  failed:     'Något gick fel. Försök igen.',
  notReady:   'Domänkopplingen är inte påslagen ännu. Så fort den är klar dyker instruktionerna upp här.',
  pending:    'Väntar på DNS',
  remove:     'Ta bort',
  hur:        'Du ändrar ett fält hos din domänleverantör. Sedan sköter vi hemsidan, mailen och certifikatet — du behöver aldrig gå in i DNS igen.',
}
