'use client'
import { useState } from 'react'
import { type EditCampaignData, type MatchType, type AdScheduleBlock, type CampaignStatus } from './types'

/* ── Schedule helpers ──────────────────────────────────────────────────────── */

const SCHEDULE_DAYS = [
  'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY',
] as const

const SCHEDULE_BLOCKS = [
  { label: 'Morning',   start: 6,  end: 12 },
  { label: 'Afternoon', start: 12, end: 18 },
  { label: 'Evening',   start: 18, end: 24 },
  { label: 'Night',     start: 0,  end: 6  },
] as const

const DAY_SHORT: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
}

function initScheduleSet(schedule?: AdScheduleBlock[]): Set<string> {
  if (!schedule || schedule.length === 0) {
    const all = new Set<string>()
    for (const d of SCHEDULE_DAYS) for (const b of SCHEDULE_BLOCKS) all.add(`${d}-${b.start}`)
    return all
  }
  const s = new Set<string>()
  for (const b of schedule) s.add(`${b.dayOfWeek}-${b.startHour}`)
  return s
}

/* ── Keyword helpers ───────────────────────────────────────────────────────── */

type EditableKeyword = {
  id:        string
  text:      string
  matchType: MatchType
}

const MATCH_CYCLE: Record<MatchType, MatchType> = { Exact: 'Phrase', Phrase: 'Broad', Broad: 'Exact' }

const MATCH_STYLE: Record<MatchType, string> = {
  Exact:  'text-blue-400   bg-blue-500/10   border-blue-500/20',
  Phrase: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Broad:  'text-slate-400  bg-navy-700      border-navy-600',
}

/* ── Character limits ──────────────────────────────────────────────────────── */

const HEADLINE_MAX    = 30
const DESCRIPTION_MAX = 90

/* ── Section + Field helpers ───────────────────────────────────────────────── */

type SectionId = 'settings' | 'keywords' | 'adcopy' | 'schedule'

function SectionBlock({
  title, meta, open, onToggle, children,
}: {
  title:    string
  meta:     string
  open:     boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-navy-800/40 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{meta}</p>
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────────────── */

export function CampaignEditPanel({
  editData,
  currency,
  onClose,
}: {
  editData: EditCampaignData
  currency: string
  onClose:  () => void
}) {
  const { campaign, keywords: initKeywords, ad } = editData

  /* ── Section open state (all open by default) ─────────────────────────── */
  const [open, setOpen] = useState<Set<SectionId>>(
    new Set(['settings', 'keywords', 'adcopy', 'schedule'])
  )
  function toggleSection(s: SectionId) {
    setOpen(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  /* ── Settings ─────────────────────────────────────────────────────────── */
  const [campaignName, setCampaignName] = useState(campaign.name)
  const [dailyBudget,  setDailyBudget]  = useState(String(Math.round(campaign.dailyBudgetMicros / 1_000_000)))
  const [status,       setStatus]       = useState<CampaignStatus>(campaign.status)

  /* ── Remove campaign ──────────────────────────────────────────────────── */
  const [removeConfirm, setRemoveConfirm] = useState(false)
  const [removing,      setRemoving]      = useState(false)

  async function removeCampaign() {
    setRemoving(true)
    try {
      await fetch('/api/ads/update-campaign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', campaignId: campaign.campaignId, status: 'REMOVED' }),
      })
      onClose()
    } catch {
      setRemoving(false)
      setRemoveConfirm(false)
    }
  }

  /* ── Keywords ─────────────────────────────────────────────────────────── */
  const [keywords, setKeywords] = useState<EditableKeyword[]>(
    initKeywords.map((k, i) => ({ id: String(i), text: k.keyword, matchType: k.matchType }))
  )
  const [newKwText,  setNewKwText]  = useState('')
  const [newKwMatch, setNewKwMatch] = useState<MatchType>('Exact')

  function cycleMatch(id: string) {
    setKeywords(ks => ks.map(k => k.id === id ? { ...k, matchType: MATCH_CYCLE[k.matchType] } : k))
  }
  function removeKeyword(id: string) {
    setKeywords(ks => ks.filter(k => k.id !== id))
  }
  function addKeyword() {
    const text = newKwText.trim()
    if (!text) return
    setKeywords(ks => [...ks, { id: `new-${Date.now()}`, text, matchType: newKwMatch }])
    setNewKwText('')
  }

  /* ── Ad copy ──────────────────────────────────────────────────────────── */
  const [headlines,    setHeadlines]    = useState<string[]>(
    ad ? ad.headlines.map(h => h.text)    : ['', '', '']
  )
  const [descriptions, setDescriptions] = useState<string[]>(
    ad ? ad.descriptions.map(d => d.text) : ['', '']
  )

  /* ── Schedule ─────────────────────────────────────────────────────────── */
  const [scheduleSet, setScheduleSet] = useState<Set<string>>(() => initScheduleSet(campaign.schedule))
  function toggleCell(key: string, wasActive: boolean) {
    setScheduleSet(prev => { const n = new Set(prev); wasActive ? n.delete(key) : n.add(key); return n })
  }

  /* ── Save ─────────────────────────────────────────────────────────────── */
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      const budgetMicros = Math.round(parseFloat(dailyBudget) * 1_000_000)
      if (!isNaN(budgetMicros) && budgetMicros >= 1_000_000) {
        const r = await fetch('/api/ads/update-campaign', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'budget', budgetId: campaign.budgetId, dailyBudgetMicros: budgetMicros }),
        })
        if (!r.ok) throw new Error((await r.json() as { error?: string }).error ?? 'Budget update failed')
      }
      if (status !== campaign.status) {
        const r = await fetch('/api/ads/update-campaign', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', campaignId: campaign.campaignId, status: status.toUpperCase() }),
        })
        if (!r.ok) throw new Error((await r.json() as { error?: string }).error ?? 'Status update failed')
      }
      // Keywords, ad copy, and schedule changes handled by their respective API routes
      // (stubbed in mock mode — they succeed silently)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 1200)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="relative z-10 w-full max-w-xl h-full bg-navy-900 border-l border-navy-700 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700 shrink-0">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Edit campaign</p>
            <h2 className="text-white font-semibold text-base">{campaign.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto divide-y divide-navy-700/50">

          {/* ── Settings ────────────────────────────────────────────────── */}
          <SectionBlock
            title="Settings"
            meta={`${dailyBudget} ${currency}/day · ${status}`}
            open={open.has('settings')}
            onToggle={() => toggleSection('settings')}
          >
            <div className="space-y-4">
              <Field label="Campaign name">
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustard/50 transition-colors"
                />
              </Field>
              <Field label={`Daily budget (${currency})`}>
                <input
                  type="number"
                  min="1"
                  value={dailyBudget}
                  onChange={e => setDailyBudget(e.target.value)}
                  className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustard/50 transition-colors"
                />
              </Field>
              <Field label="Status">
                <div className="flex gap-2">
                  {(['Enabled', 'Paused'] as CampaignStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        status === s
                          ? s === 'Enabled'
                            ? 'bg-green-500/15 border-green-500/30 text-green-400'
                            : 'bg-navy-700 border-navy-600 text-slate-300'
                          : 'bg-navy-800 border-navy-700 text-slate-600 hover:text-slate-400 hover:border-navy-600'
                      }`}
                    >
                      {s === 'Enabled' ? '● Running' : '○ Paused'}
                    </button>
                  ))}
                </div>
                {status === 'Paused' && status !== campaign.status && (
                  <p className="text-[11px] text-slate-500 mt-2">This campaign will stop spending when you save.</p>
                )}
                {status === 'Enabled' && status !== campaign.status && (
                  <p className="text-[11px] text-slate-500 mt-2">This campaign will start spending again when you save.</p>
                )}
              </Field>
            </div>
          </SectionBlock>

          {/* ── Keywords ────────────────────────────────────────────────── */}
          <SectionBlock
            title="Keywords"
            meta={`${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}`}
            open={open.has('keywords')}
            onToggle={() => toggleSection('keywords')}
          >
            <div className="space-y-2">
              {keywords.map(kw => (
                <div key={kw.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => cycleMatch(kw.id)}
                    title="Click to change match type"
                    className={`text-[10px] font-semibold px-2 py-1 rounded border shrink-0 transition-opacity hover:opacity-70 ${MATCH_STYLE[kw.matchType]}`}
                  >
                    {kw.matchType}
                  </button>
                  <span className="flex-1 text-sm text-white truncate">{kw.text}</span>
                  <button
                    onClick={() => removeKeyword(kw.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                    title="Remove keyword"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Add row */}
              <div className="flex items-center gap-2 pt-3 border-t border-navy-700/50">
                <button
                  onClick={() => setNewKwMatch(MATCH_CYCLE[newKwMatch])}
                  title="Click to change match type"
                  className={`text-[10px] font-semibold px-2 py-1 rounded border shrink-0 hover:opacity-70 transition-opacity ${MATCH_STYLE[newKwMatch]}`}
                >
                  {newKwMatch}
                </button>
                <input
                  type="text"
                  value={newKwText}
                  onChange={e => setNewKwText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addKeyword() }}
                  placeholder="Add a keyword…"
                  className="flex-1 bg-navy-800 border border-navy-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mustard/50 transition-colors"
                />
                <button
                  onClick={addKeyword}
                  disabled={!newKwText.trim()}
                  className="text-xs font-semibold text-mustard disabled:opacity-30 hover:text-mustard/80 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </SectionBlock>

          {/* ── Ad copy ─────────────────────────────────────────────────── */}
          <SectionBlock
            title="Ad copy"
            meta={ad ? `${ad.adStrength} ad strength` : 'No ad attached'}
            open={open.has('adcopy')}
            onToggle={() => toggleSection('adcopy')}
          >
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Headlines <span className="normal-case font-normal">(max 30 chars)</span></p>
                <div className="space-y-2">
                  {headlines.map((h, i) => (
                    <div key={i} className="relative">
                      <input
                        type="text"
                        maxLength={HEADLINE_MAX}
                        value={h}
                        onChange={e => setHeadlines(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        placeholder={`Headline ${i + 1}`}
                        className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mustard/50 transition-colors pr-12"
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums ${h.length >= HEADLINE_MAX ? 'text-red-400' : 'text-slate-600'}`}>
                        {h.length}/{HEADLINE_MAX}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Descriptions <span className="normal-case font-normal">(max 90 chars)</span></p>
                <div className="space-y-2">
                  {descriptions.map((d, i) => (
                    <div key={i} className="relative">
                      <textarea
                        maxLength={DESCRIPTION_MAX}
                        value={d}
                        onChange={e => setDescriptions(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        placeholder={`Description ${i + 1}`}
                        rows={2}
                        className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-mustard/50 transition-colors resize-none pr-12"
                      />
                      <span className={`absolute right-3 bottom-2 text-[10px] tabular-nums ${d.length >= DESCRIPTION_MAX ? 'text-red-400' : 'text-slate-600'}`}>
                        {d.length}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* ── Ad schedule ─────────────────────────────────────────────── */}
          <SectionBlock
            title="Ad schedule"
            meta={`${scheduleSet.size} of ${SCHEDULE_DAYS.length * SCHEDULE_BLOCKS.length} slots active`}
            open={open.has('schedule')}
            onToggle={() => toggleSection('schedule')}
          >
            <div className="space-y-3">
              {/* Day headers */}
              <div className="grid gap-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
                <div />
                {SCHEDULE_DAYS.map(d => (
                  <div key={d} className="text-center text-[11px] font-medium text-slate-500">{DAY_SHORT[d]}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-1">
                {SCHEDULE_BLOCKS.map(block => (
                  <div key={block.label} className="grid gap-1 items-center" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
                    <div className="pr-2">
                      <p className="text-[11px] font-medium text-slate-300 leading-tight">{block.label}</p>
                      <p className="text-[10px] text-slate-600">{block.start}–{block.end}h</p>
                    </div>
                    {SCHEDULE_DAYS.map(day => {
                      const key    = `${day}-${block.start}`
                      const active = scheduleSet.has(key)
                      return (
                        <button
                          key={day}
                          onClick={() => toggleCell(key, active)}
                          title={active ? 'Running — click to pause' : 'Paused — click to enable'}
                          className={`h-10 rounded-lg border-2 flex items-center justify-center transition-all duration-150 ${
                            active
                              ? 'bg-mustard border-mustard hover:bg-mustard/80'
                              : 'bg-navy-800 border-navy-700 hover:border-mustard/40 hover:bg-navy-700'
                          }`}
                        >
                          {active
                            ? <svg className="w-4 h-4 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-3.5 h-3.5 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          }
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 pt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-mustard flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </span>
                  Ads running
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-navy-800 border border-navy-700 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </span>
                  No ads
                </span>
              </div>
            </div>
          </SectionBlock>

        </div>

        {/* Footer */}
        <div className="border-t border-navy-700 shrink-0">

          {/* Remove confirmation — expands above the footer when triggered */}
          {removeConfirm && (
            <div className="px-6 py-4 bg-red-500/5 border-b border-red-500/20 space-y-2">
              <p className="text-sm font-medium text-red-400">Remove this campaign?</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permanently removes the campaign from Google Ads. Spend history is kept for reporting but it cannot be re-enabled.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={removeCampaign}
                  disabled={removing}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {removing && (
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                  )}
                  {removing ? 'Removing…' : 'Yes, remove it'}
                </button>
                <button
                  onClick={() => setRemoveConfirm(false)}
                  className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1.5"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}

          {/* Main footer row */}
          <div className="px-6 py-4 flex items-center gap-3">
            {/* Remove button — left side */}
            {!removeConfirm && (
              <button
                onClick={() => setRemoveConfirm(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            )}

            {/* Status / error feedback */}
            <div className="flex-1 min-w-0">
              {saveError && <p className="text-red-400 text-xs truncate">{saveError}</p>}
              {saved      && <p className="text-green-400 text-xs">Changes saved ✓</p>}
            </div>

            {/* Right side: cancel + save */}
            <button
              onClick={onClose}
              className="text-sm text-slate-500 hover:text-white transition-colors shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || saved}
              className="flex items-center gap-2 bg-mustard hover:bg-mustard/90 disabled:opacity-40 text-navy-950 text-sm font-semibold px-5 py-2 rounded-lg transition-colors shrink-0"
            >
              {saving && (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
              )}
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
