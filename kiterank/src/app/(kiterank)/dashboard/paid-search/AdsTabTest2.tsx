'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { ExternalLink } from '@/components/ExternalLink'
import { extensionBlocker } from './helpers'
import { useLang } from '@/components/LanguageProvider'
import { type AdsData, type AdSnippet, type AdsAd, type AdStrength, type AssetPerformance, type AdSitelink } from './types'

/* ── Shared helpers ────────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin inline" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
    </svg>
  )
}

const STRENGTH: Record<AdStrength, { sv: string; en: string; textColor: string; borderBg: string }> = {
  Excellent: { sv: 'Utmärkt', en: 'Excellent', textColor: 'text-green-400', borderBg: 'bg-green-500/10 border-green-500/25' },
  Good:      { sv: 'Bra',     en: 'Good',      textColor: 'text-blue-400',  borderBg: 'bg-blue-500/10 border-blue-500/25'  },
  Average:   { sv: 'Medel',   en: 'Average',   textColor: 'text-mustard',   borderBg: 'bg-mustard/10 border-mustard/25'    },
  Poor:      { sv: 'Svag',    en: 'Poor',      textColor: 'text-red-400',   borderBg: 'bg-red-500/10 border-red-500/25'    },
}

const STRENGTH_TIP: Record<AdStrength, { sv: string; en: string }> = {
  Excellent: {
    sv: 'Välbyggd och konkurrenskraftig — Google visar den oftare till lägre kostnad.',
    en: 'Well-built and competitive — Google shows it more at lower cost.',
  },
  Good: {
    sv: 'En stabil annons. Fler unika rubrikvarianter kan lyfta den till Utmärkt.',
    en: 'Solid ad. More unique headline variations will push it to Excellent.',
  },
  Average: {
    sv: 'Lägg till mer variation i rubrikerna och gör texten mer lik dina sökord.',
    en: 'Add more variety to headlines and make the copy closer to your keywords.',
  },
  Poor: {
    sv: 'Behöver jobb — lägg till fler rubriker, matcha sökorden bättre och se till att landningssidan stämmer.',
    en: 'Needs work — add more headlines, fix keyword relevance, and match the landing page.',
  },
}

const ASSET_PERF: Record<AssetPerformance, { sv: string; en: string; badge: string; tipSv: string; tipEn: string }> = {
  Best: {
    sv: 'Bäst', en: 'Best', badge: 'text-green-400 bg-green-500/10',
    tipSv: 'Google gynnar den här aktivt — den ger flest klick. Behåll den.',
    tipEn: 'Google is actively favouring this — it drives the most clicks. Keep it.',
  },
  Good: {
    sv: 'Bra', en: 'Good', badge: 'text-blue-400 bg-blue-500/10',
    tipSv: 'Fungerar bra. Används regelbundet tillsammans med dina bästa texter.',
    tipEn: 'Performing well. Used regularly alongside your best assets.',
  },
  Low: {
    sv: 'Låg', en: 'Low', badge: 'text-red-400 bg-red-500/10',
    tipSv: 'Google undviker den här eftersom den presterar sämre. Byt ut den mot något mer specifikt eller mer lockande.',
    tipEn: 'Google is avoiding this because it underperforms. Replace it with something more specific or urgent.',
  },
  Learning: {
    sv: 'Testas', en: 'Learning', badge: 'text-slate-400 bg-navy-700',
    tipSv: 'Inget är fel — Google testar fortfarande texten. Ge den ett par veckor innan du bestämmer dig för att ändra.',
    tipEn: 'Nothing is wrong — Google is still testing this text. Give it a couple of weeks before deciding to change it.',
  },
}

// Tooltip texts for stats and badges a rookie could misread
const T: Record<string, { sv: string; en: string }> = {
  impressions: {
    sv: 'Hur många gånger annonsen visats på Google denna månad.',
    en: 'How many times the ad was shown on Google this month.',
  },
  ctr: {
    sv: 'Andelen som klickade av alla som såg annonsen. Låg andel betyder att texten inte lockar tillräckligt.',
    en: 'The share of viewers who clicked the ad. A low share means the copy is not compelling enough.',
  },
  clicks: {
    sv: 'Antal klick på annonsen denna månad.',
    en: 'Number of clicks on the ad this month.',
  },
  customers: {
    sv: 'Hur många klick som blev kunder. Klick utan kunder tyder på att sidan efter klicket behöver ses över.',
    en: 'How many clicks turned into customers. Clicks without customers suggest the page after the click needs work.',
  },
  assetActive: {
    sv: 'Tillägget är uppsatt och visas tillsammans med dina annonser.',
    en: 'This asset is set up and shows alongside your ads.',
  },
  assetMissing: {
    sv: 'Tillägget är inte uppsatt än. Varje tillägg gör annonsen större och lättare att klicka på — utan extra kostnad.',
    en: 'This asset is not set up yet. Each one makes your ad larger and easier to click — at no extra cost.',
  },
  assetOptional: {
    sv: 'Ett valfritt tillägg. Sätt upp det i Google Ads om det passar din verksamhet.',
    en: 'An optional asset. Set it up in Google Ads if it suits your business.',
  },
}

/* ── Reusable save-state button ────────────────────────────────────────────── */

type SaveBtn = { saving: boolean; saved: boolean; disabled?: boolean; onClick: () => void; label?: string }
function SaveButton({ saving, saved, disabled, onClick, label }: SaveBtn) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  return (
    <button
      onClick={onClick}
      disabled={saving || saved || disabled}
      className="bg-mustard hover:bg-mustard/90 disabled:opacity-40 text-navy-950 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors"
    >
      {saving
        ? <><Spinner /> {sv ? 'Sparar…' : 'Saving…'}</>
        : saved
          ? (sv ? 'Sparad ✓' : 'Saved ✓')
          : (label ?? (sv ? 'Spara' : 'Save'))}
    </button>
  )
}

/* ══ EXTENSION CARDS ════════════════════════════════════════════════════════ */

/* ── Call ──────────────────────────────────────────────────────────────────── */
export function CallCard({ initialNumber }: { initialNumber: string }) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [editing, setEditing] = useState(false)
  const [number,  setNumber]  = useState(initialNumber)
  const [draft,   setDraft]   = useState(initialNumber)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  const failedMsg = sv ? 'Kunde inte spara' : 'Save failed'

  async function save() {
    if (!draft.trim()) return
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/ads/update-extensions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'call', phone: draft.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? failedMsg)
      const blocked = extensionBlocker(json, sv)
      if (blocked) { setError(blocked); return }
      setNumber(draft.trim())
      setSaved(true)
      setTimeout(() => { setSaved(false); setEditing(false) }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : failedMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AssetRow title={sv ? 'Telefonnummer' : 'Call asset'} active check detail={number || undefined}
      isOpen={editing} onToggle={() => { setEditing(e => !e); if (!editing) setDraft(number) }}>
      <input
        type="tel"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="+46 8 000 000 00"
        className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <SaveButton saving={saving} saved={saved} disabled={!draft.trim()} onClick={save} />
        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>
    </AssetRow>
  )
}

/* ── Sitelinks ─────────────────────────────────────────────────────────────── */
export function SitelinksCard({ initialLinks }: { initialLinks: AdSitelink[] }) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [editing,  setEditing]  = useState(false)
  const [links,    setLinks]    = useState<AdSitelink[]>(initialLinks)
  const [drafts,   setDrafts]   = useState<AdSitelink[]>(initialLinks)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  const failedMsg = sv ? 'Kunde inte spara' : 'Save failed'

  function updateDraft(i: number, field: keyof AdSitelink, val: string) {
    setDrafts(prev => prev.map((d, j) => j === i ? { ...d, [field]: val } : d))
  }

  async function save() {
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/ads/update-extensions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sitelinks', sitelinks: drafts }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? failedMsg)
      const blocked = extensionBlocker(json, sv)
      if (blocked) { setError(blocked); return }
      setLinks(drafts)
      setSaved(true)
      setTimeout(() => { setSaved(false); setEditing(false) }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : failedMsg)
    } finally {
      setSaving(false)
    }
  }

  const detail = sv
    ? `${links.length} länk${links.length !== 1 ? 'ar' : ''}`
    : `${links.length} link${links.length !== 1 ? 's' : ''}`

  return (
    <AssetRow title={sv ? 'Extra länkar' : 'Sitelinks'} active check detail={detail}
      isOpen={editing} onToggle={() => { setEditing(e => !e); if (!editing) setDrafts(links) }}>
      <div className="space-y-3">
        {drafts.map((d, i) => (
          <div key={i} className="space-y-1.5 pb-3 border-b border-navy-700/50 last:border-0">
            <div className="relative">
              <input
                maxLength={25}
                value={d.title}
                onChange={e => updateDraft(i, 'title', e.target.value)}
                placeholder={sv ? 'Länkens rubrik' : 'Link title'}
                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none pr-7"
              />
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs tabular-nums pointer-events-none ${25 - d.title.length <= 4 ? 'text-mustard' : 'text-slate-700'}`}>
                {25 - d.title.length}
              </span>
            </div>
            <div className="relative">
              <input
                maxLength={35}
                value={d.description}
                onChange={e => updateDraft(i, 'description', e.target.value)}
                placeholder={sv ? 'Kort beskrivning' : 'Short description'}
                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none pr-7"
              />
              <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs tabular-nums pointer-events-none ${35 - d.description.length <= 5 ? 'text-mustard' : 'text-slate-700'}`}>
                {35 - d.description.length}
              </span>
            </div>
            <input
              value={d.url}
              onChange={e => updateDraft(i, 'url', e.target.value)}
              placeholder="https://yoursite.com/page"
              className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-slate-500 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <SaveButton saving={saving} saved={saved} onClick={save} />
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      </div>
    </AssetRow>
  )
}

/* ── Callouts ──────────────────────────────────────────────────────────────── */
export function CalloutsCard({ initialActive }: { initialActive: boolean }) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [active,  setActive]  = useState(initialActive)
  const [open,    setOpen]    = useState(false)
  const [texts,   setTexts]   = useState(['', '', '', ''])
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  const failedMsg = sv ? 'Kunde inte spara' : 'Save failed'

  const placeholders = sv
    ? ['Gratis offert', 'Service samma dag', 'Fullt försäkrade', 'Ingen framkörningsavgift']
    : ['Free quotes', 'Same-day service', 'Fully insured', 'No call-out fee']

  async function save() {
    const vals = texts.filter(t => t.trim())
    if (!vals.length) return
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/ads/update-extensions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'callout', callouts: vals }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? failedMsg)
      const blocked = extensionBlocker(json, sv)
      if (blocked) { setError(blocked); return }
      setActive(true); setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false) }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : failedMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AssetRow title={sv ? 'Extra fördelar' : 'Callouts'} active={active} check={active}
      isOpen={open} onToggle={() => setOpen(o => !o)}>
      <div className="space-y-1.5">
        {texts.map((t, i) => {
          const remaining = 25 - t.length
          return (
            <div key={i} className="relative">
              <input
                type="text"
                maxLength={25}
                value={t}
                placeholder={placeholders[i]}
                onChange={e => setTexts(prev => prev.map((x, k) => k === i ? e.target.value : x))}
                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none pr-7"
              />
              <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums pointer-events-none ${remaining <= 3 ? 'text-mustard' : 'text-slate-700'}`}>
                {remaining}
              </span>
            </div>
          )
        })}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <SaveButton saving={saving} saved={saved} disabled={texts.filter(t => t.trim()).length === 0} onClick={save} />
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      </div>
    </AssetRow>
  )
}

/* ── Location ──────────────────────────────────────────────────────────────── */
/* The green line used to claim a connected Google Business Profile without
 * checking. On an account with no profile linked that is simply untrue, and
 * the button below it would fail. Both now follow the real connection. */
export function LocationCard({ initialActive = false, gbpConnected = true }: {
  initialActive?: boolean
  gbpConnected?:  boolean
} = {}) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [enabled, setEnabled] = useState(initialActive)
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const failedMsg = sv ? 'Misslyckades' : 'Failed'

  async function enable() {
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/ads/update-extensions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'location' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? failedMsg)
      const blocked = extensionBlocker(json, sv)
      if (blocked) { setError(blocked); return }
      setEnabled(true); setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : failedMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AssetRow title={sv ? 'Adress' : 'Location'} active={enabled} check={enabled}
      detail={enabled ? (sv ? 'Från din Google-företagsprofil' : 'From Google Business Profile') : undefined}
      isOpen={open} onToggle={() => setOpen(o => !o)}>
      {gbpConnected ? (
        <div className="flex items-center gap-1.5 text-xs text-green-400/80 bg-green-500/5 border border-green-500/15 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {sv
            ? 'Din Google-företagsprofil är kopplad — din adress hämtas automatiskt.'
            : 'Your Google Business Profile is connected — your address will be pulled automatically.'}
        </div>
      ) : (
        <div className="text-xs text-slate-400 bg-navy-900 border border-navy-700 rounded-lg px-3 py-2">
          {sv
            ? 'Adressen hämtas från din Google-företagsprofil. Ingen profil är kopplad ännu, så det finns ingen adress att visa.'
            : 'The address comes from your Google Business Profile. No profile is connected yet, so there is no address to show.'}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={enable}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs font-semibold bg-mustard hover:bg-mustard/90 disabled:opacity-60 text-navy-950 px-3.5 py-1.5 rounded-lg transition-colors"
        >
          {saving
            ? <><Spinner /> {sv ? 'Aktiverar…' : 'Enabling…'}</>
            : (sv ? 'Visa adressen i annonsen' : 'Enable location asset')}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </AssetRow>
  )
}

/* ── Structured snippets ───────────────────────────────────────────────────── */
const SNIPPET_HEADERS = ['Services', 'Products', 'Brands', 'Destinations', 'Styles', 'Types']

const SNIPPET_HEADERS_SV: Record<string, string> = {
  Services:     'Tjänster',
  Products:     'Produkter',
  Brands:       'Varumärken',
  Destinations: 'Resmål',
  Styles:       'Stilar',
  Types:        'Typer',
}

/* AdsData already carries the snippet Google holds — undefined means none is
 * configured. Starting from a blank card regardless told every account it had
 * none. */
export function SnippetsCard({ initialSnippet }: { initialSnippet?: AdSnippet } = {}) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const [active,  setActive]  = useState(!!initialSnippet)
  const [open,    setOpen]    = useState(false)
  const [header,  setHeader]  = useState(initialSnippet?.header ?? 'Services')
  const [values,  setValues]  = useState(
    [...(initialSnippet?.values ?? []), '', '', '', ''].slice(0, 4),
  )
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  const failedMsg = sv ? 'Kunde inte spara' : 'Save failed'

  const placeholders = sv
    ? ['Balayage', 'Slingor', 'Klippning', 'Bruduppsättning']
    : ['Balayage', 'Highlights', 'Haircuts', 'Bridal hair']

  async function save() {
    const vals = values.filter(v => v.trim())
    if (vals.length < 3) return
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/ads/update-extensions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'structured_snippet', header, values: vals }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? failedMsg)
      const blocked = extensionBlocker(json, sv)
      if (blocked) { setError(blocked); return }
      setActive(true); setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false) }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : failedMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AssetRow title={sv ? 'Tjänstelista' : 'Structured snippets'} active={active} check={active}
      detail={active ? (sv ? SNIPPET_HEADERS_SV[header] ?? header : header) : undefined}
      isOpen={open} onToggle={() => setOpen(o => !o)}>
      <div className="space-y-2">
        <div>
          <p className="text-xs text-slate-500 mb-1">{sv ? 'Kategori' : 'Category'}</p>
          <select
            value={header}
            onChange={e => setHeader(e.target.value)}
            className="bg-navy-900 border border-navy-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-mustard/50"
          >
            {SNIPPET_HEADERS.map(h => (
              <option key={h} value={h}>{sv ? SNIPPET_HEADERS_SV[h] ?? h : h}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">
            {sv ? 'Värden' : 'Values'} <span className="font-normal">({sv ? 'minst 3' : 'min 3'})</span>
          </p>
          <div className="space-y-1.5">
            {values.map((v, i) => (
              <div key={i} className="relative">
                <input
                  maxLength={25}
                  value={v}
                  placeholder={placeholders[i] ?? (sv ? 'Tjänstens namn' : 'Service name')}
                  onChange={e => setValues(prev => prev.map((x, k) => k === i ? e.target.value : x))}
                  className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none pr-7"
                />
                <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums pointer-events-none ${25 - v.length <= 4 ? 'text-mustard' : 'text-slate-700'}`}>
                  {25 - v.length}
                </span>
              </div>
            ))}
            {values.length < 10 && (
              <button onClick={() => setValues(v => [...v, ''])} className="text-xs text-slate-500 hover:text-mustard transition-colors">
                {sv ? '+ Lägg till värde' : '+ Add value'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SaveButton
            saving={saving}
            saved={saved}
            disabled={values.filter(v => v.trim()).length < 3}
            onClick={save}
            label={sv ? 'Spara listan' : 'Save snippets'}
          />
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
        {values.filter(v => v.trim()).length < 3 && values.some(v => v.trim()) && (
          <p className="text-slate-500 text-xs">{sv ? 'Lägg till minst 3 värden för att spara' : 'Add at least 3 values to save'}</p>
        )}
      </div>
    </AssetRow>
  )
}

/* ── Asset row shell ──────────────────────────────────────────────────────── */
export function AssetRow({
  title, active, check, detail, isOpen, onToggle, children, optional,
}: {
  title:     string
  active:    boolean
  check?:    boolean
  detail?:   string
  isOpen:    boolean
  onToggle?: () => void
  children?: React.ReactNode
  optional?: boolean
}) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
        <span className={`flex-1 text-sm font-medium ${active ? 'text-white' : 'text-slate-400'}`}>{title}</span>
        {detail && <span className="text-xs text-slate-500 shrink-0">{detail}</span>}
        {optional
          ? (
            <Tooltip text={sv ? T.assetOptional.sv : T.assetOptional.en}>
              <span className="text-xs text-slate-500 shrink-0 cursor-default">{sv ? 'Valfritt' : 'Optional'}</span>
            </Tooltip>
          )
          : check
            ? (
              <Tooltip text={sv ? T.assetActive.sv : T.assetActive.en}>
                <span className="text-green-400 text-xs font-medium shrink-0 cursor-default">{sv ? 'Aktiv' : 'Active'}</span>
              </Tooltip>
            )
            : (
              <Tooltip text={sv ? T.assetMissing.sv : T.assetMissing.en}>
                <span className="text-xs font-semibold text-mustard bg-mustard/10 border border-mustard/20 px-1.5 py-0.5 rounded shrink-0 cursor-default">{sv ? 'Saknas' : 'Missing'}</span>
              </Tooltip>
            )
        }
        {onToggle ? (
          <button onClick={onToggle}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
              isOpen
                ? 'text-slate-400 hover:text-white'
                : check
                  ? 'text-slate-500 hover:text-white border border-navy-700 hover:border-navy-600'
                  : 'text-mustard border border-mustard/25 bg-mustard/10 hover:bg-mustard/20'
            }`}>
            {isOpen ? (sv ? 'Avbryt' : 'Cancel') : check ? (sv ? 'Ändra' : 'Edit') : (sv ? 'Sätt upp' : 'Set up')}
          </button>
        ) : (
          <ExternalLink href="https://ads.google.com/aw/extensions"
            className="text-xs text-slate-500 hover:text-slate-300 border border-navy-700/50 px-2.5 py-1 rounded-lg transition-colors shrink-0 inline-flex items-center gap-1.5">
            {sv ? 'Öppna i Google Ads' : 'Open in Google Ads'}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </ExternalLink>
        )}
      </div>
      {isOpen && children && (
        <div className="border-t border-navy-700 px-4 py-4 bg-navy-950/50 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

/* ══ Main tab ════════════════════════════════════════════════════════════════ */

/*
 * The running ads, shared by both modes.
 *
 * Every figure here is Google's: the ad strength, the per-asset rating on each
 * headline, impressions, click rate, clicks and conversions. `attributeRating`
 * only changes how the low-rating line is worded — see AdsTabGoogle.
 */
export function RunningAdsList({ ads, attributeRating = false }: {
  ads: AdsAd[]
  attributeRating?: boolean
}) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const sortedAds = [...ads].sort((a, b) => b.impressions - a.impressions)

  const failedMsg = sv ? 'Kunde inte spara' : 'Save failed'

  // Ad copy editing — same as full AdsTab
  type EditState = { headlines: string[]; descriptions: string[]; saving: boolean; saved: boolean; error: string }
  const [editing, setEditing] = useState<Record<string, EditState>>({})

  function startEdit(ad: AdsAd) {
    setEditing(e => ({
      ...e,
      [ad.adId]: { headlines: ad.headlines.map(h => h.text), descriptions: ad.descriptions.map(d => d.text), saving: false, saved: false, error: '' },
    }))
  }
  function cancelEdit(adId: string) {
    setEditing(e => { const n = { ...e }; delete n[adId]; return n })
  }
  async function saveAd(adId: string) {
    const s = editing[adId]
    if (!s) return
    const headlines    = s.headlines.filter(h => h.trim())
    const descriptions = s.descriptions.filter(d => d.trim())
    if (headlines.length < 3 || descriptions.length < 2) return
    setEditing(e => ({ ...e, [adId]: { ...e[adId], saving: true, error: '' } }))
    try {
      const res  = await fetch('/api/ads/update-ad', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adId, headlines, descriptions }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? failedMsg)
      setEditing(e => ({ ...e, [adId]: { ...e[adId], saving: false, saved: true } }))
      setTimeout(() => cancelEdit(adId), 2000)
    } catch (err) {
      setEditing(e => ({ ...e, [adId]: { ...e[adId], saving: false, error: err instanceof Error ? err.message : failedMsg } }))
    }
  }

  return (
    <div>
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{sv ? 'Aktiva annonser' : 'Running ads'}</h2>
        <div className="space-y-3">
          {sortedAds.map(ad => {
            const s        = STRENGTH[ad.adStrength]
            const lowCount = ad.headlines.filter(h => h.performance === 'Low').length
                           + ad.descriptions.filter(d => d.performance === 'Low').length
            const es       = editing[ad.adId]
            const isEditing = !!es

            return (
              <div key={ad.adId} className="bg-navy-800 rounded-xl border border-navy-700 p-5">
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">{ad.campaign}</p>
                    {lowCount > 0 && (
                      <p className={attributeRating ? 'text-mustard text-xs' : 'text-red-400 text-xs'}>
                        {attributeRating
                          ? (sv
                              ? `Google har gett ${lowCount} ${lowCount > 1 ? 'texter' : 'text'} betyget Låg`
                              : `Google rates ${lowCount} ${lowCount > 1 ? 'assets' : 'asset'} Low`)
                          : (sv
                              ? `${lowCount} rubrik${lowCount > 1 ? 'er' : ''} med lågt betyg — Google undviker ${lowCount > 1 ? 'dem' : 'den'}`
                              : `${lowCount} headline${lowCount > 1 ? 's' : ''} rated Low — Google is avoiding ${lowCount > 1 ? 'them' : 'it'}`)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isEditing && (
                      <button onClick={() => startEdit(ad)} className="text-xs text-slate-500 hover:text-white border border-navy-700 hover:border-navy-600 px-2.5 py-1 rounded-lg transition-colors">
                        {sv ? 'Ändra texten' : 'Edit copy'}
                      </button>
                    )}
                    <Tooltip text={sv ? STRENGTH_TIP[ad.adStrength].sv : STRENGTH_TIP[ad.adStrength].en}>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-default ${s.textColor} ${s.borderBg}`}>
                        {sv ? s.sv : s.en}
                      </span>
                    </Tooltip>
                  </div>
                </div>

                {isEditing ? (
                  <>
                    <div className="mb-4">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                        {sv ? 'Rubriker' : 'Headlines'}{' '}
                        <span className="normal-case font-normal">{sv ? '(minst 3, max 15 · 30 tecken var)' : '(min 3, max 15 · 30 chars each)'}</span>
                      </p>
                      <div className="space-y-2">
                        {es.headlines.map((h, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input type="text" maxLength={30} value={h}
                                onChange={e => setEditing(prev => ({ ...prev, [ad.adId]: { ...prev[ad.adId], headlines: prev[ad.adId].headlines.map((x, k) => k === j ? e.target.value : x) } }))}
                                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none pr-8"
                              />
                              <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs tabular-nums pointer-events-none ${30 - h.length <= 3 ? 'text-mustard' : 'text-slate-700'}`}>{30 - h.length}</span>
                            </div>
                            {es.headlines.length > 3 && (
                              <button onClick={() => setEditing(prev => ({ ...prev, [ad.adId]: { ...prev[ad.adId], headlines: prev[ad.adId].headlines.filter((_, k) => k !== j) } }))} className="text-slate-600 hover:text-red-400 text-sm transition-colors">×</button>
                            )}
                          </div>
                        ))}
                        {es.headlines.length < 15 && (
                          <button onClick={() => setEditing(prev => ({ ...prev, [ad.adId]: { ...prev[ad.adId], headlines: [...prev[ad.adId].headlines, ''] } }))} className="text-xs text-slate-500 hover:text-mustard transition-colors">
                            {sv ? '+ Lägg till rubrik' : '+ Add headline'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">
                        {sv ? 'Beskrivningar' : 'Descriptions'}{' '}
                        <span className="normal-case font-normal">{sv ? '(minst 2, max 4 · 90 tecken var)' : '(min 2, max 4 · 90 chars each)'}</span>
                      </p>
                      <div className="space-y-2">
                        {es.descriptions.map((d, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <div className="relative flex-1">
                              <textarea maxLength={90} rows={2} value={d}
                                onChange={e => setEditing(prev => ({ ...prev, [ad.adId]: { ...prev[ad.adId], descriptions: prev[ad.adId].descriptions.map((x, k) => k === j ? e.target.value : x) } }))}
                                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none resize-none pb-5"
                              />
                              <span className={`absolute right-2.5 bottom-2 text-xs tabular-nums pointer-events-none ${90 - d.length <= 5 ? 'text-mustard' : 'text-slate-700'}`}>{90 - d.length}</span>
                            </div>
                            {es.descriptions.length > 2 && (
                              <button onClick={() => setEditing(prev => ({ ...prev, [ad.adId]: { ...prev[ad.adId], descriptions: prev[ad.adId].descriptions.filter((_, k) => k !== j) } }))} className="text-slate-600 hover:text-red-400 text-sm transition-colors mt-2">×</button>
                            )}
                          </div>
                        ))}
                        {es.descriptions.length < 4 && (
                          <button onClick={() => setEditing(prev => ({ ...prev, [ad.adId]: { ...prev[ad.adId], descriptions: [...prev[ad.adId].descriptions, ''] } }))} className="text-xs text-slate-500 hover:text-mustard transition-colors">
                            {sv ? '+ Lägg till beskrivning' : '+ Add description'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t border-navy-700 flex-wrap">
                      <button onClick={() => saveAd(ad.adId)} disabled={es.saving || es.headlines.filter(h => h.trim()).length < 3 || es.descriptions.filter(d => d.trim()).length < 2} className="bg-mustard hover:bg-mustard/90 disabled:opacity-40 text-navy-950 font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors">
                        {es.saving ? (sv ? 'Sparar…' : 'Saving…') : (sv ? 'Spara till Google' : 'Save to Google')}
                      </button>
                      <button onClick={() => cancelEdit(ad.adId)} className="text-slate-500 hover:text-white text-sm transition-colors">{sv ? 'Avbryt' : 'Cancel'}</button>
                      {es.saved  && <span className="text-green-400 text-sm">{sv ? 'Sparad ✓' : 'Saved ✓'}</span>}
                      {es.error  && <span className="text-red-400 text-sm">{es.error}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{sv ? 'Rubriker' : 'Headlines'}</p>
                      <div className="space-y-1.5">
                        {ad.headlines.map((h, j) => {
                          const perf = ASSET_PERF[h.performance]
                          return (
                            <div key={j} className="flex items-center gap-2">
                              <span className="text-blue-400 text-sm font-medium flex-1">{h.text}</span>
                              <Tooltip text={sv ? perf.tipSv : perf.tipEn}>
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 cursor-default ${perf.badge}`}>{sv ? perf.sv : perf.en}</span>
                              </Tooltip>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{sv ? 'Beskrivningar' : 'Descriptions'}</p>
                      <div className="space-y-1.5">
                        {ad.descriptions.map((d, j) => {
                          const perf = ASSET_PERF[d.performance]
                          return (
                            <div key={j} className="flex items-start gap-2">
                              <span className="text-slate-400 text-xs leading-relaxed flex-1">{d.text}</span>
                              <Tooltip text={sv ? perf.tipSv : perf.tipEn}>
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 cursor-default mt-0.5 ${perf.badge}`}>{sv ? perf.sv : perf.en}</span>
                              </Tooltip>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-x-6 gap-y-2 pt-4 border-t border-navy-700 text-xs flex-wrap">
                      <Tooltip text={sv ? T.impressions.sv : T.impressions.en}>
                        <div className="cursor-default"><span className="text-slate-500">{sv ? 'Visningar ' : 'Impressions '}</span><span className="text-white font-medium tabular-nums">{ad.impressions.toLocaleString('sv-SE')}</span></div>
                      </Tooltip>
                      <Tooltip text={sv ? T.ctr.sv : T.ctr.en}>
                        <div className="cursor-default"><span className="text-slate-500">{sv ? 'Klickfrekvens ' : 'CTR '}</span><span className="text-white font-medium tabular-nums">{(ad.ctr * 100).toFixed(2)}%</span></div>
                      </Tooltip>
                      <Tooltip text={sv ? T.clicks.sv : T.clicks.en}>
                        <div className="cursor-default"><span className="text-slate-500">{sv ? 'Klick ' : 'Clicks '}</span><span className="text-white font-medium tabular-nums">{ad.clicks}</span></div>
                      </Tooltip>
                      <Tooltip text={sv ? T.customers.sv : T.customers.en}>
                        <div className="cursor-default"><span className="text-slate-500">{sv ? 'Kunder ' : 'Customers '}</span><span className={`font-medium tabular-nums ${ad.conversions > 0 ? 'text-green-400' : 'text-slate-500'}`}>{ad.conversions}</span></div>
                      </Tooltip>
                    </div>
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

export function AdsTabTest2({ data }: { data: AdsData }) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const callExt      = data.adExtensions.find(e => e.type === 'Call')
  const missingCount = data.adExtensions.filter(e => !e.active).length

  return (
    <>
      <RunningAdsList ads={data.ads} />

      {/* ── Ad assets ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">{sv ? 'Annonstillägg' : 'Ad assets'}</h2>
          {missingCount > 0 && (
            <span className="text-xs text-mustard">
              {sv
                ? `${missingCount} saknas — varje tillägg gör din annons större och lättare att klicka på`
                : `${missingCount} not set up — each one makes your ad larger and more clickable`}
            </span>
          )}
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700 overflow-hidden">
          <CallCard     initialNumber={callExt?.detail ?? ''} />
          <SitelinksCard initialLinks={data.sitelinks} />
          <CalloutsCard  initialActive={data.adExtensions.find(e => e.type === 'Callouts')?.active ?? false} />
          <LocationCard />
          <SnippetsCard />
          <AssetRow title={sv ? 'Kontaktformulär' : 'Lead form'} active={false} optional isOpen={false} />
        </div>
      </div>
    </>
  )
}
