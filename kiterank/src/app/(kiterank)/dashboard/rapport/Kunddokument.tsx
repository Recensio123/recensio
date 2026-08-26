'use client'
import { useState } from 'react'
import { Markdown } from '@/components/Markdown'

/*
 * Rapporten kunden fått, som de läser den.
 *
 * Dokumentet är skrivet av oss och redigerat innan det gick ut — här visas det
 * som det står, inget mer. Det enda kunden gör på sidan är att godkänna
 * planen, och det är därför knappen är det enda färgade på hela sidan.
 *
 * Godkännandet skriver till databasen. En knapp som bara byter färg i
 * webbläsaren är värdelös den dag någon frågar vad som var överenskommet — och
 * det är precis den dagen den behövs.
 */

export type Dokument = {
  id:         string
  titel:      string
  period:     string | null
  innehall:   string
  status:     string
  skickad_at: string | null
  godkand_at: string | null
  godkand_av: string | null
}

export function Kunddokument({ dok, epost }: { dok: Dokument; epost: string }) {
  const [status,  setStatus]  = useState(dok.status)
  const [av,      setAv]      = useState(dok.godkand_av)
  const [nar,     setNar]     = useState(dok.godkand_at)
  const [jobbar,  setJobbar]  = useState(false)
  const [fel,     setFel]     = useState('')

  const godkand = status === 'godkand'

  async function godkann() {
    setJobbar(true); setFel('')
    try {
      const res = await fetch('/api/rapport/godkann', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: dok.id }),
      })
      const json = await res.json()
      if (!res.ok) { setFel('Kunde inte spara godkännandet. Försök igen.'); return }
      setStatus('godkand')
      setAv(json.av ?? epost)
      setNar(json.nar ?? new Date().toISOString())
    } catch {
      setFel('Ingen kontakt med servern.')
    } finally {
      setJobbar(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8">
        <div className="flex items-baseline gap-3 flex-wrap mb-6 pb-5 border-b border-navy-800">
          <h2 className="text-white text-xl font-bold">{dok.titel}</h2>
          {dok.skickad_at && (
            <span className="text-slate-500 text-xs">
              Skickad {new Date(dok.skickad_at).toLocaleDateString('sv-SE')}
            </span>
          )}
        </div>

        <Markdown text={dok.innehall} />
      </div>

      {/*
        * Godkännandet.
        *
        * Ligger utanför dokumentet och inte i det. Texten ovanför är vad vi
        * skrivit; det här är vad kunden gör — och de två ska inte se ut som
        * samma sak.
        */}
      <div className={`rounded-2xl border-2 p-7 ${
        godkand ? 'border-green-500/30 bg-green-500/5' : 'border-mustard/30 bg-mustard/5'
      }`}>
        {godkand ? (
          <>
            <p className="text-green-400 font-bold">✓ Planen är godkänd</p>
            <p className="text-slate-400 text-sm mt-1.5">
              Godkänd {nar ? new Date(nar).toLocaleString('sv-SE') : ''}
              {av ? ` av ${av}` : ''}. Vi kör enligt planen.
            </p>
          </>
        ) : (
          <>
            <p className="text-white font-bold">Godkänn planen för nästa månad</p>
            <p className="text-slate-400 text-sm leading-relaxed mt-1.5">
              Hör vi inget inom sju dagar fortsätter vi enligt planen med oförändrad budget.
              En höjd budget genomförs aldrig utan att ni sagt ja.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-5">
              <button
                onClick={godkann}
                disabled={jobbar}
                className="bg-mustard hover:bg-mustard-light text-navy-950 font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {jobbar ? 'Sparar…' : 'Godkänn planen'}
              </button>
              <a
                href="/dashboard/support"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Något ni vill ändra? Hör av er
              </a>
            </div>
            {fel && <p className="text-red-400 text-sm mt-3">{fel}</p>}
          </>
        )}
      </div>
    </div>
  )
}
