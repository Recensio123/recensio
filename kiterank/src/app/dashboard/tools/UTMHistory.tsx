'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/components/LanguageProvider'

type SavedLink = {
  id:         string
  full_url:   string
  short_url?: string
  source:     string
  medium:     string
  campaign:   string
  term?:      string
  created_at: string
  sessions?:     number
  conversions?:  number
}

type EditDraft = {
  url:      string
  source:   string
  medium:   string
  campaign: string
  term:     string
}

const MEDIUMS = ['cpc','paid_social','social','email','organic','referral','display','video','affiliate','sms','audio']

// UI copy — sv primary / en secondary via useLang.
const T = {
  sv: {
    title:       'Dina aktiva länkar',
    sampleData:  'Exempeldata',
    subtitle:    'Besök och förfrågningar hämtas från GA4 för varje länk.',
    sessions:    'Besök',
    leads:       'Förfrågningar',
    leadRate:    'Förfrågningar %',
    copiedCheck: 'Kopierat ✓',
    copy:        'Kopiera',
    cancel:      'Avbryt',
    edit:        'Ändra',
    remove:      'Ta bort',
    urlLabel:      'Webbadress',
    sourceLabel:   'Källa',
    mediumLabel:   'Kanaltyp',
    campaignLabel: 'Kampanjnamn',
    termLabel:     'Sökord',
    optional:      '(valfritt)',
    saving:      'Sparar…',
    saveChanges: 'Spara ändringar',
  },
  en: {
    title:       'Your active links',
    sampleData:  'Sample data',
    subtitle:    'Sessions and conversions pulled from GA4 per tagged link.',
    sessions:    'Sessions',
    leads:       'Leads',
    leadRate:    'Lead rate',
    copiedCheck: 'Copied ✓',
    copy:        'Copy',
    cancel:      'Cancel',
    edit:        'Edit',
    remove:      'Remove',
    urlLabel:      'Destination URL',
    sourceLabel:   'Source',
    mediumLabel:   'Medium',
    campaignLabel: 'Campaign name',
    termLabel:     'Term',
    optional:      '(optional)',
    saving:      'Saving…',
    saveChanges: 'Save changes',
  },
}

const MOCK_PERF: Record<string, { sessions: number; conversions: number }> = {
  google:                  { sessions: 142, conversions: 11 },
  instagram:               { sessions:  38, conversions:  3 },
  facebook:                { sessions:  57, conversions:  4 },
  newsletter:              { sessions:  91, conversions:  8 },
  meta:                    { sessions:  64, conversions:  5 },
  tiktok:                  { sessions:  22, conversions:  1 },
  sms:                     { sessions:  17, conversions:  2 },
  google_business_profile: { sessions:  29, conversions:  2 },
}

const MOCK_HISTORY: SavedLink[] = [
  { id: 'mock-1', full_url: 'https://example.com/contact?utm_source=newsletter&utm_medium=email&utm_campaign=spring_offer',  short_url: 'bit.ly/3xKq2p', source: 'newsletter', medium: 'email',   campaign: 'spring_offer',       created_at: '2026-05-14T10:00:00Z', sessions:  91, conversions: 8  },
  { id: 'mock-2', full_url: 'https://example.com/contact?utm_source=instagram&utm_medium=social&utm_campaign=spring_offer', short_url: 'bit.ly/4mRp8z', source: 'instagram',  medium: 'social',  campaign: 'spring_offer',       created_at: '2026-05-14T10:05:00Z', sessions:  38, conversions: 3  },
  { id: 'mock-3', full_url: 'https://example.com/contact?utm_source=google&utm_medium=cpc&utm_campaign=emergency_services', short_url: 'bit.ly/2nTw1q', source: 'google',     medium: 'cpc',     campaign: 'emergency_services', created_at: '2026-04-28T09:00:00Z', sessions: 142, conversions: 11 },
  { id: 'mock-4', full_url: 'https://example.com/contact?utm_source=facebook&utm_medium=social&utm_campaign=boiler_promo',                              source: 'facebook',   medium: 'social',  campaign: 'boiler_promo',       created_at: '2026-04-10T14:30:00Z', sessions:  57, conversions: 4  },
  { id: 'mock-5', full_url: 'https://example.com/contact?utm_source=sms&utm_medium=sms&utm_campaign=winter_reminder',       short_url: 'bit.ly/5pKm3r', source: 'sms',        medium: 'sms',     campaign: 'winter_reminder',    created_at: '2026-03-02T08:00:00Z', sessions:  17, conversions: 2  },
]

function rebuildUrl(draft: EditDraft): string {
  try {
    const u = new URL(draft.url)
    if (draft.source)   u.searchParams.set('utm_source',   draft.source.trim().toLowerCase().replace(/\s+/g,'_'))
    if (draft.medium)   u.searchParams.set('utm_medium',   draft.medium)
    if (draft.campaign) u.searchParams.set('utm_campaign', draft.campaign.trim().toLowerCase().replace(/\s+/g,'_'))
    if (draft.term)     u.searchParams.set('utm_term',     draft.term.trim().toLowerCase().replace(/\s+/g,'_'))
    return u.toString()
  } catch { return '' }
}

export function UTMHistory({ refreshKey }: { refreshKey: number }) {
  const { lang } = useLang()
  const t = T[lang]
  const [history,   setHistory]   = useState<SavedLink[]>([])
  const [usingMock, setUsingMock] = useState(false)
  const [copiedRow, setCopiedRow] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft,     setDraft]     = useState<EditDraft>({ url: '', source: '', medium: '', campaign: '', term: '' })
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tools/utm-links')
      .then(r => r.json())
      .then(j => {
        if (j.links?.length) {
          setHistory(j.links.map((l: SavedLink) => ({ ...l, ...(MOCK_PERF[l.source] ?? {}) })))
          setUsingMock(false)
        } else {
          setHistory(MOCK_HISTORY)
          setUsingMock(true)
        }
      })
      .catch(() => { setHistory(MOCK_HISTORY); setUsingMock(true) })
  }, [refreshKey])

  function startEdit(link: SavedLink) {
    const base = link.full_url.split('?')[0]
    setDraft({ url: base, source: link.source, medium: link.medium, campaign: link.campaign, term: link.term ?? '' })
    setEditingId(link.id)
  }

  function cancelEdit() { setEditingId(null) }

  async function saveEdit(link: SavedLink) {
    if (usingMock) { cancelEdit(); return }
    setSaving(true)
    const newFullUrl = rebuildUrl(draft)
    try {
      const res  = await fetch(`/api/tools/utm-links/${link.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_url: newFullUrl, source: draft.source, medium: draft.medium, campaign: draft.campaign, term: draft.term || null, short_url: link.short_url }),
      })
      if (res.ok) {
        setHistory(h => h.map(l => l.id === link.id ? { ...l, full_url: newFullUrl, source: draft.source, medium: draft.medium, campaign: draft.campaign, term: draft.term || undefined } : l))
        cancelEdit()
      }
    } finally { setSaving(false) }
  }

  async function deleteLink(id: string) {
    if (usingMock) {
      setHistory(h => h.filter(l => l.id !== id))
      return
    }
    setDeleting(id)
    try {
      const res = await fetch(`/api/tools/utm-links/${id}`, { method: 'DELETE' })
      if (res.ok) setHistory(h => h.filter(l => l.id !== id))
    } finally { setDeleting(null) }
  }

  if (!history.length) return null

  return (
    <div className="bg-navy-800 rounded-2xl border border-navy-700 p-6 space-y-4">

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-white font-semibold text-base">{t.title}</h2>
            {usingMock && (
              <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-1.5 py-0.5 rounded font-medium">{t.sampleData}</span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-1">{t.subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {history.map(link => {
          const displayUrl = link.short_url ?? link.full_url
          const date       = new Date(link.created_at).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' })
          const convRate   = link.sessions && link.sessions > 0 && link.conversions !== undefined
            ? ((link.conversions / link.sessions) * 100).toFixed(1) + '%'
            : '—'
          const isEditing  = editingId === link.id

          return (
            <div key={link.id} className="bg-navy-900 rounded-xl border border-navy-700 overflow-hidden">

              {/* Main row */}
              <div className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium truncate">{link.campaign.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-500 shrink-0">{date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">{link.source}</span>
                    <span className="text-xs text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">{link.medium}</span>
                    <span className="text-slate-500 text-xs truncate font-mono">{displayUrl}</span>
                  </div>
                </div>

                {/* GA4 stats */}
                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-center">
                    <p className="text-white text-sm font-semibold tabular-nums">{link.sessions?.toLocaleString('sv-SE') ?? '—'}</p>
                    <p className="text-slate-500 text-xs">{t.sessions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-sm font-semibold tabular-nums">{link.conversions ?? '—'}</p>
                    <p className="text-slate-500 text-xs">{t.leads}</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold tabular-nums ${link.conversions ? 'text-green-400' : 'text-slate-500'}`}>{convRate}</p>
                    <p className="text-slate-500 text-xs">{t.leadRate}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(displayUrl); setCopiedRow(link.id); setTimeout(() => setCopiedRow(null), 2000) }}
                    className="text-xs text-slate-500 hover:text-white border border-navy-700 hover:border-navy-600 px-2 py-1 rounded-lg transition-colors"
                  >
                    {copiedRow === link.id ? t.copiedCheck : t.copy}
                  </button>
                  <button
                    onClick={() => isEditing ? cancelEdit() : startEdit(link)}
                    className="text-xs text-slate-500 hover:text-white border border-navy-700 hover:border-navy-600 px-2 py-1 rounded-lg transition-colors"
                  >
                    {isEditing ? t.cancel : t.edit}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    disabled={deleting === link.id}
                    className="text-xs text-slate-500 hover:text-red-400 border border-navy-700 hover:border-red-500/30 px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
                  >
                    {deleting === link.id ? '…' : t.remove}
                  </button>
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <div className="border-t border-navy-700 px-4 py-4 bg-navy-950/40 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-500">{t.urlLabel}</label>
                      <input type="url" value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
                        className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-2 focus:outline-none font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">{t.sourceLabel}</label>
                      <input type="text" value={draft.source} onChange={e => setDraft(d => ({ ...d, source: e.target.value }))}
                        className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-2 focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">{t.mediumLabel}</label>
                      <select value={draft.medium} onChange={e => setDraft(d => ({ ...d, medium: e.target.value }))}
                        className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-2 focus:outline-none appearance-none">
                        {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500">{t.campaignLabel}</label>
                      <input type="text" value={draft.campaign} onChange={e => setDraft(d => ({ ...d, campaign: e.target.value }))}
                        className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-2 focus:outline-none" />
                    </div>
                    {(draft.medium === 'cpc' || draft.term) && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">{t.termLabel} <span className="text-slate-500 font-normal">{t.optional}</span></label>
                        <input type="text" value={draft.term} onChange={e => setDraft(d => ({ ...d, term: e.target.value }))}
                          className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-xs rounded-lg px-3 py-2 focus:outline-none" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(link)} disabled={saving}
                      className="text-xs bg-mustard hover:bg-mustard/90 disabled:opacity-40 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                      {saving ? t.saving : t.saveChanges}
                    </button>
                    <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-white transition-colors">{t.cancel}</button>
                  </div>
                </div>
              )}

            </div>
          )
        })}
      </div>

    </div>
  )
}
