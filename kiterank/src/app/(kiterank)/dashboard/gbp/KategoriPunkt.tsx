'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { type GoogleCategory } from '@/lib/gbpCategories'

/*
 * The category on the Google profile, as a checklist item.
 *
 * It sits with the profile because the profile owns it, and because it is the
 * one field that decides which category searches the business can surface for
 * in Maps at all.
 *
 * What it does not do is judge. An earlier version compared the category
 * against the trade chosen in our setup wizard and announced a mismatch — on
 * ids we had written from memory, and on the assumption that a five-step form
 * filled in once is more reliable than how the owner filed their own business.
 * Now the platform shows what Google says, in Google's words, and offers the
 * only two answers that exist: it is right, or it is this instead.
 *
 * Confirming writes nothing to Google. Changing does, so the picker holds only
 * categories from Google's own list for the market — every option offered is
 * one that actually exists.
 */

type Data = {
  current:     GoogleCategory | null
  confirmed?:  boolean
  categories?: GoogleCategory[]
  reason?:     string
}

const T = {
  sv: {
    label:      (c: string) => `Du listas som ${c} på Google`,
    okLabel:    (c: string) => `Kategori: ${c}`,
    tip:        'Kategorin på din Google-profil avgör vilka sökningar du kan dyka upp på i kartan. Den är hämtad direkt från din profil.',
    confirm:    'Stämmer',
    change:     'Byt kategori',
    cancel:     'Avbryt',
    search:     'Sök kategori…',
    noHits:     'Ingen kategori matchar det du skrev.',
    saving:     'Sparar…',
    saved:      'Sparat ✓',
    failed:     'Kunde inte spara',
    noProfile:  'Ingen Google-profil kopplad, så ingenting ändrades.',
    warning:    'Byter du kategori ändras din profil på Google direkt.',
  },
  en: {
    label:      (c: string) => `Google lists you as ${c}`,
    okLabel:    (c: string) => `Category: ${c}`,
    tip:        'The category on your Google profile decides which searches you can appear for on the map. This is read straight from your profile.',
    confirm:    'That is right',
    change:     'Change category',
    cancel:     'Cancel',
    search:     'Search categories…',
    noHits:     'No category matches what you typed.',
    saving:     'Saving…',
    saved:      'Saved ✓',
    failed:     'Could not save',
    noProfile:  'No Google profile connected, so nothing changed.',
    warning:    'Changing the category updates your profile on Google straight away.',
  },
}

export function KategoriPunkt() {
  const { lang } = useLang()
  const t = T[lang]

  const [data,    setData]    = useState<Data | null>(null)
  const [picking, setPicking] = useState(false)
  const [query,   setQuery]   = useState('')
  const [saving,  setSaving]  = useState('')
  const [done,    setDone]    = useState<GoogleCategory | 'confirmed' | null>(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let alive = true
    fetch('/api/gbp/category-check')
      .then(r => r.json())
      .then(j => { if (alive) setData(j) })
      .catch(() => { if (alive) setData({ current: null }) })
    return () => { alive = false }
  }, [])

  /* Nothing to show until the profile has told us something. */
  if (!data?.current) return null

  const settled = done !== null || data.confirmed === true
  const shown   = done && done !== 'confirmed' ? done : data.current

  async function send(body: object, mark: GoogleCategory | 'confirmed') {
    setSaving(typeof mark === 'string' ? mark : mark.id); setError('')
    try {
      const res  = await fetch('/api/gbp/update-category', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok)       throw new Error(json.error ?? t.failed)
      if (!json.applied) { setError(t.noProfile); return }
      setDone(mark); setPicking(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed)
    } finally { setSaving('') }
  }

  const hits = (data.categories ?? [])
    .filter(c => c.label.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8)

  return (
    <div className="px-4 py-3 border-b border-navy-700/60 last:border-b-0">
      <div className="flex items-start gap-3 flex-wrap">
        <span
          title={t.tip}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded-full grid place-items-center text-xs cursor-default ${
            settled ? 'bg-green-500/15 text-green-400' : 'bg-navy-700 text-slate-400'
          }`}
        >
          {settled ? '✓' : '?'}
        </span>

        <div className="flex-1 min-w-[180px]">
          <p className={`text-sm ${settled ? 'text-slate-300' : 'text-white font-medium'}`}>
            {settled ? t.okLabel(shown.label) : t.label(shown.label)}
          </p>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        {!settled && !picking && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => send({ confirm: true }, 'confirmed')}
              disabled={!!saving}
              className="text-xs font-semibold bg-navy-700 hover:bg-navy-600 disabled:opacity-50 text-slate-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving === 'confirmed' ? t.saving : t.confirm}
            </button>
            <button
              onClick={() => setPicking(true)}
              className="text-xs text-slate-500 hover:text-white border border-navy-700 hover:border-navy-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              {t.change}
            </button>
          </div>
        )}

        {done && <span className="text-green-400 text-xs shrink-0">{t.saved}</span>}
      </div>

      {/* Picker — Google's own categories, the ones nearest the trade first */}
      {picking && (
        <div className="mt-3 ml-8 space-y-2">
          <p className="text-mustard text-xs">{t.warning}</p>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.search}
            className="w-full max-w-sm bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none placeholder:text-slate-600"
          />
          {hits.length === 0 ? (
            <p className="text-slate-500 text-xs">{t.noHits}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {hits.map(c => (
                <button
                  key={c.id}
                  onClick={() => send({ categoryId: c.id }, c)}
                  disabled={!!saving}
                  className="text-xs text-slate-200 border border-navy-600 hover:border-mustard/40 hover:text-white disabled:opacity-50 px-2.5 py-1 rounded-full transition-colors"
                >
                  {saving === c.id ? t.saving : c.label}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setPicking(false)} className="text-xs text-slate-500 hover:text-white transition-colors">
            {t.cancel}
          </button>
        </div>
      )}
    </div>
  )
}
