'use client'
import { useState } from 'react'
import { MAX_ANTECKNING } from '@/lib/kundanteckning'

/*
 * Salongens anteckning om en kund.
 *
 * Samma ruta i kommandelistan och i historiken, av ett skäl som inte är
 * bekvämlighet: anteckningen hör till personen och inte till besöket, så den
 * som skrivs före tiden ska vara densamma som läses efteråt. Två rutor hade
 * blivit två anteckningar.
 *
 * Hopfälld tills någon behöver den. En rad per kund med en öppen textruta gör
 * en lista på trettio bokningar oläslig, och de flesta kunder har ingen
 * anteckning alls.
 *
 * Sparas med en knapp och inte när fältet lämnas. Ett klick bredvid ska inte
 * kunna skriva om en färgformel, och den som ändrat sig ska kunna backa.
 */

const T = {
  add:    '+ Anteckning',
  title:  'Anteckning',
  hint:   'Syns bara för dig och din personal. Skickas aldrig till kunden.',
  save:   'Spara',
  cancel: 'Avbryt',
  saving: 'Sparar…',
  failed: 'Kunde inte spara. Försök igen.',
  ph:     'Färgformel, önskemål, sådant som är bra att minnas till nästa gång.',
}

export function KundAnteckning({ nyckel, värde, onSparad, låst = false }: {
  /** Kundens nyckel — telefon, annars mejl, annars namn. */
  nyckel:   string
  värde:    string
  onSparad: (text: string) => void
  /** Exempeldata. Rutan går att öppna och läsa, men inte att skriva till en
   *  kund som inte finns. */
  låst?:    boolean
}) {
  const [öppen,  setÖppen]  = useState(false)
  const [utkast, setUtkast] = useState(värde)
  const [sparar, setSparar] = useState(false)
  const [fel,    setFel]    = useState('')

  function öppna() {
    setUtkast(värde)
    setFel('')
    setÖppen(true)
  }

  async function spara() {
    const text = utkast.trim()
    if (låst) { onSparad(text); setÖppen(false); return }

    setSparar(true); setFel('')
    try {
      const res = await fetch('/api/customer-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: nyckel, note: text }),
      })
      if (!res.ok) throw new Error(String(res.status))
      onSparad(text)
      setÖppen(false)
    } catch {
      setFel(T.failed)
    } finally {
      setSparar(false)
    }
  }

  if (!öppen) {
    return (
      <button
        onClick={öppna}
        className={`text-left text-xs rounded-lg px-2.5 py-1.5 border transition-colors ${
          värde
            ? 'bg-navy-900 border-navy-700 text-slate-300 hover:border-slate-500'
            : 'border-dashed border-navy-600 text-slate-500 hover:text-slate-300 hover:border-slate-500'
        }`}
      >
        {värde
          ? <><span className="text-slate-500">{T.title}: </span>{värde}</>
          : T.add}
      </button>
    )
  }

  return (
    <div className="bg-navy-900 border border-navy-700 rounded-lg p-3 w-full">
      <label className="block text-slate-400 text-xs font-medium mb-1">{T.title}</label>
      <textarea
        value={utkast}
        onChange={e => setUtkast(e.target.value.slice(0, MAX_ANTECKNING))}
        rows={3}
        autoFocus
        placeholder={T.ph}
        className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-mustard focus:outline-none"
      />
      <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
        <p className="text-slate-500 text-xs">{T.hint}</p>
        <span className="text-slate-600 text-xs tabular-nums">{utkast.length}/{MAX_ANTECKNING}</span>
      </div>
      {fel && <p className="text-red-400 text-xs mt-2">{fel}</p>}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => void spara()}
          disabled={sparar}
          className="px-3 py-1.5 bg-mustard text-navy-900 rounded-lg text-xs font-semibold disabled:opacity-60"
        >
          {sparar ? T.saving : T.save}
        </button>
        <button
          onClick={() => setÖppen(false)}
          className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg text-xs font-semibold"
        >
          {T.cancel}
        </button>
      </div>
    </div>
  )
}
