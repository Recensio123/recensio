'use client'
import { useState } from 'react'
import type { Underlag } from '@/lib/kunddokument'

/*
 * Skapa och redigera ett kunddokument.
 *
 * Tre steg som syns samtidigt: vad vi vet om kunden, vad du vill lägga till
 * som modellen inte kan veta, och det färdiga dokumentet.
 *
 * Underlaget står överst med flit. Ser du att bokningarna saknas vet du att
 * dokumentet inte kan säga vad en bokning kostar — och då är det bättre att
 * koppla systemet först än att skicka en rapport med ett hål i.
 */

const kort: React.CSSProperties = {
  border: '1px solid #1e293b', borderRadius: 11, padding: '13px 16px',
  background: '#0f172a', marginBottom: 14,
}
const rubrik: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px',
}
const knapp = (primär: boolean): React.CSSProperties => ({
  padding: '9px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  background: primär ? '#f0b429' : 'transparent',
  color: primär ? '#0b1220' : '#cbd5e1',
  border: `1px solid ${primär ? '#f0b429' : '#334155'}`,
})

export function Dokumentverktyg({
  kundId, kundNamn, mallar, underlag, tidigare,
}: {
  kundId:   string
  kundNamn: string
  mallar:   { slug: string; titel: string }[]
  underlag: Underlag
  tidigare: { id: string; titel: string; period: string | null; status: string; skapad: string }[]
}) {
  const [mall,      setMall]      = useState(mallar[0]?.slug ?? 'annonsstrategi')
  const [extra,     setExtra]     = useState('')
  const [innehall,  setInnehall]  = useState('')
  const [titel,     setTitel]     = useState('')
  const [kör,       setKör]       = useState(false)
  const [sparar,    setSparar]    = useState(false)
  const [besked,    setBesked]    = useState('')
  const [sparatId,  setSparatId]  = useState<string | null>(null)
  const [skickar,   setSkickar]   = useState(false)
  const [skickat,   setSkickat]   = useState(false)

  /* Perioden i klartext, till dokumentets namn. Rapporten handlar om månaden
     som gått, inte den som börjat. */
  const period = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' })
  })()

  async function skapa() {
    setKör(true); setBesked(''); setSparatId(null)
    try {
      const res = await fetch('/api/admin/kunddokument', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companyId: kundId, mall, extra }),
      })
      const json = await res.json()
      if (!res.ok) {
        setBesked(
          json.error === 'ingen_nyckel' ? 'ANTHROPIC_API_KEY saknas i miljön.'
            : json.error === 'modellen'  ? `Modellen svarade inte: ${json.detalj ?? ''}`
            : 'Något gick fel.',
        )
        return
      }
      setInnehall(json.innehall)
      setTitel(`${json.titel} — ${kundNamn}, ${period}`)
    } finally {
      setKör(false)
    }
  }

  async function spara() {
    setSparar(true); setBesked('')
    try {
      const res = await fetch('/api/admin/kunddokument', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id: sparatId, companyId: kundId, mall, titel, period, innehall, underlag,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setBesked('Kunde inte spara.'); return }
      setSparatId(json.id)
      setBesked('Sparat.')
      /* En ändring efter att dokumentet skickats ska kunna skickas igen — det
         är samma rad, och kunden ska se den rättade texten. */
      setSkickat(false)
    } finally {
      setSparar(false)
    }
  }

  async function skicka() {
    if (!sparatId) return
    setSkickar(true); setBesked('')
    try {
      const res = await fetch('/api/admin/kunddokument', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: sparatId }),
      })
      if (!res.ok) { setBesked('Kunde inte skicka.'); return }
      setSkickat(true)
    } finally {
      setSkickar(false)
    }
  }

  const u = underlag

  return (
    <div>
      {/* ── Underlaget ───────────────────────────────────────────────── */}
      <div style={kort}>
        <p style={rubrik}>Underlaget — {kundNamn}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Siffra
            etikett="Bokningar 30 dagar"
            värde={u.bokningar ? `${u.bokningar.senaste30} st` : '—'}
            under={u.bokningar
              ? `${u.bokningar.värde30.toLocaleString('sv-SE')} kr · föregående ${u.bokningar.föregående30}`
              : 'bokningssystemet inte påkopplat'}
          />
          <Siffra
            etikett="Annonskostnad 30 dagar"
            värde={u.annonser.kopplat ? `${u.annonser.kostnad30.toLocaleString('sv-SE')} kr` : '—'}
            under={u.annonser.kopplat ? `${u.annonser.kampanjer.length} kampanjer` : 'Ads inte kopplat'}
          />
          <Siffra
            etikett="Kostnad per bokning"
            värde={
              u.bokningar && u.annonser.kopplat && u.bokningar.senaste30 > 0
                ? `${Math.round(u.annonser.kostnad30 / u.bokningar.senaste30)} kr`
                : '—'
            }
            under="annonskostnad delat med bokningar"
          />
          <Siffra
            etikett="Google-profil"
            värde={u.profil?.betyg ? `${u.profil.betyg} ★` : '—'}
            under={u.profil ? `${u.profil.antalOmdömen ?? 0} omdömen · ${u.profil.besvarade ?? 0} besvarade` : 'ingen hämtning än'}
          />
          <Siffra etikett="Tjänster inlagda" värde={`${u.tjänster.length} st`} under={u.företag.branschNamn} />
          <Siffra etikett="Sökord med data" värde={`${u.sökord.length} st`} under={u.företag.ort ?? 'ort saknas'} />
        </div>

        {u.saknas.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e293b' }}>
            <p style={{ fontSize: 12, color: '#f0b429', margin: '0 0 4px', fontWeight: 600 }}>
              Det här saknas — dokumentet kommer att säga att det inte går att mäta
            </p>
            {u.saknas.map(s => (
              <p key={s} style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0' }}>· {s}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── Körningen ────────────────────────────────────────────────── */}
      <div style={kort}>
        <p style={rubrik}>Skapa</p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {mallar.map(m => (
            <button
              key={m.slug}
              onClick={() => setMall(m.slug)}
              style={{
                padding: '7px 13px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
                background: mall === m.slug ? '#1e293b' : 'transparent',
                border: `1px solid ${mall === m.slug ? '#334155' : '#1e293b'}`,
                color: mall === m.slug ? '#f1f5f9' : '#94a3b8',
                fontWeight: mall === m.slug ? 700 : 500,
              }}
            >
              {m.titel}
            </button>
          ))}
        </div>

        {/* Det du vet som inte står i någon tabell. Ligger sist i anropet och
            väger därför tyngst — du har träffat kunden, det har ingen tabell. */}
        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>
          Egna anteckningar om kunden (valfritt)
        </label>
        <textarea
          value={extra}
          onChange={e => setExtra(e.target.value)}
          rows={3}
          placeholder="T.ex. de vill inte annonsera på herrklippning, de har ny personal från mars, budgeten är max 3 000 kr."
          style={{
            width: '100%', background: '#0b1220', border: '1px solid #1e293b', borderRadius: 9,
            padding: '10px 12px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit',
            resize: 'vertical', marginBottom: 12,
          }}
        />

        <button onClick={skapa} disabled={kör} style={{ ...knapp(true), opacity: kör ? 0.6 : 1 }}>
          {kör ? 'Skriver…' : 'Skapa dokument'}
        </button>
        {besked && <span style={{ fontSize: 12.5, color: '#f0b429', marginLeft: 12 }}>{besked}</span>}
      </div>

      {/* ── Dokumentet ───────────────────────────────────────────────── */}
      {innehall && (
        <div style={kort}>
          <p style={rubrik}>Dokumentet</p>
          <input
            value={titel}
            onChange={e => setTitel(e.target.value)}
            style={{
              width: '100%', background: '#0b1220', border: '1px solid #1e293b', borderRadius: 9,
              padding: '9px 12px', color: '#f1f5f9', fontSize: 13.5, fontWeight: 600,
              fontFamily: 'inherit', marginBottom: 10,
            }}
          />
          {/* Ren text och inte ett formaterat fält. Ett dokument ska gå att
              läsa exakt som det kommer att levereras, utan osynlig formatering
              som ändrar sig när det klistras vidare. */}
          <textarea
            value={innehall}
            onChange={e => setInnehall(e.target.value)}
            rows={26}
            style={{
              width: '100%', background: '#0b1220', border: '1px solid #1e293b', borderRadius: 9,
              padding: '12px 14px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7,
              fontFamily: 'var(--font-geist-mono, monospace)', resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={spara} disabled={sparar} style={{ ...knapp(true), opacity: sparar ? 0.6 : 1 }}>
              {sparar ? 'Sparar…' : sparatId ? 'Spara ändringar' : 'Spara dokumentet'}
            </button>
            {/* Skickandet kräver att dokumentet är sparat. Ett utkast som bara
                finns i den här rutan har ingen rad att flytta till kunden. */}
            <button
              onClick={skicka}
              disabled={!sparatId || skickar || skickat}
              style={{
                ...knapp(false),
                opacity: !sparatId || skickar ? 0.45 : 1,
                borderColor: skickat ? '#4ade80' : '#334155',
                color: skickat ? '#4ade80' : '#cbd5e1',
              }}
              title={sparatId ? 'Dokumentet blir synligt i kundens panel' : 'Spara dokumentet först'}
            >
              {skickat ? '✓ Skickat till kunden' : skickar ? 'Skickar…' : 'Skicka till kunden'}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(innehall)}
              style={knapp(false)}
            >
              Kopiera texten
            </button>
          </div>
          {skickat && (
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Ligger nu i kundens panel under Månadsrapport. Mejlet som säger till om det skickas
              inte än — säg till kunden själv tills utskicken är påkopplade.
            </p>
          )}
        </div>
      )}

      {/* ── Tidigare ─────────────────────────────────────────────────── */}
      {tidigare.length > 0 && (
        <div style={kort}>
          <p style={rubrik}>Tidigare dokument</p>
          {tidigare.map(d => (
            <div
              key={d.id}
              style={{
                display: 'flex', gap: 12, padding: '7px 0', borderTop: '1px solid #1e293b',
                fontSize: 12.5, color: '#cbd5e1', alignItems: 'baseline',
              }}
            >
              <span style={{ flex: 1 }}>{d.titel}</span>
              <span style={{ color: '#64748b' }}>{d.period ?? ''}</span>
              <span style={{ color: d.status === 'godkand' ? '#4ade80' : '#64748b' }}>{d.status}</span>
              <span style={{ color: '#475569' }}>{new Date(d.skapad).toLocaleDateString('sv-SE')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Siffra({ etikett, värde, under }: { etikett: string; värde: string; under: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {etikett}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, color: värde === '—' ? '#475569' : '#f1f5f9', margin: '3px 0 1px' }}>
        {värde}
      </p>
      <p style={{ fontSize: 11.5, color: '#64748b', margin: 0 }}>{under}</p>
    </div>
  )
}
