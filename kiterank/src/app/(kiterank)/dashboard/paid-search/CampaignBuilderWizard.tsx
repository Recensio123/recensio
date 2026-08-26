'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ExternalLink } from '@/components/ExternalLink'
import { type AdsData, type MatchType } from './types'
import { type SelectedKeyword } from './KeywordGeneratorPanel'

// ssr: false keeps Leaflet out of the server bundle entirely
const RadiusMap = dynamic(() => import('./RadiusMap'), {
  ssr:     false,
  loading: () => <div className="w-full rounded-xl bg-navy-800 border border-navy-700 animate-pulse" style={{ height: 224 }} />,
})

// ─── Local types ─────────────────────────────────────────────────────────────

type Goal          = 'leads' | 'calls' | 'traffic'
type TargetingType = 'region' | 'postcodes' | 'radius'

type RadiusCoords = { lat: number; lng: number; displayName: string }
type BuilderStep   = 1 | 2 | 3 | 4 | 5

type BuilderKeyword = {
  id:         string
  text:       string
  matchType:  MatchType
  cpcEuros:   number
  source:     'existing' | 'recommended' | 'custom'
  included:   boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_LABELS = ['Goal', 'Settings', 'Keywords', 'Ad copy', 'Export']

const MATCH_CYCLE: Record<MatchType, MatchType> = {
  Exact:  'Phrase',
  Phrase: 'Broad',
  Broad:  'Exact',
}

const MATCH_STYLE: Record<MatchType, string> = {
  Exact:  'text-green-400 bg-green-500/10 border-green-500/20',
  Phrase: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Broad:  'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

const GOAL_OPTIONS: { id: Goal; icon: string; title: string; desc: string }[] = [
  {
    id:    'leads',
    icon:  '📋',
    title: 'Website leads',
    desc:  'Maximise form fills, quote requests, and contact-page submissions. Google optimises spend toward conversion events on your site.',
  },
  {
    id:    'calls',
    icon:  '📞',
    title: 'Phone calls',
    desc:  'Prioritise call conversions. Best for service businesses where the customer journey starts with a call.',
  },
  {
    id:    'traffic',
    icon:  '↗',
    title: 'Website traffic',
    desc:  "Maximise clicks. Useful when you're building awareness or haven't set up conversion tracking yet.",
  },
]

const GOAL_LABEL: Record<Goal, string> = {
  leads:   'Website leads',
  calls:   'Phone calls',
  traffic: 'Website traffic',
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function csvCell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`
}

function generateAdsEditorCSV(params: {
  campaignName:  string
  dailyBudget:   number
  goal:          Goal
  location:      string
  targetingType: TargetingType
  postcodes:     string[]
  radiusCoords:  RadiusCoords | null
  radiusKm:      number
  keywords:      BuilderKeyword[]
  headlines:     string[]
  descriptions:  string[]
  finalUrl:      string
  currency:      string
}): string {
  const { campaignName, dailyBudget, goal, location, targetingType, postcodes, radiusCoords, radiusKm, keywords, headlines, descriptions, finalUrl } = params
  const adGroupName  = `${campaignName} — Main`
  const bidStrategy  = goal === 'traffic' ? 'Maximize clicks' : 'Maximize conversions'
  const today        = new Date().toISOString().slice(0, 10)
  const activeKws    = keywords.filter(k => k.included)
  const maxCpc       = activeKws.length
    ? activeKws.reduce((m, k) => Math.max(m, k.cpcEuros), 0).toFixed(2)
    : '5.00'
  const rows: string[] = []

  // Campaign
  rows.push('# Campaign')
  rows.push(['Campaign', 'Daily budget', 'Campaign type', 'Bid strategy type', 'Networks', 'Status', 'Start date'].map(csvCell).join(','))
  rows.push([campaignName, dailyBudget.toFixed(2), 'Search', bidStrategy, 'Search Network', 'Enabled', today].map(csvCell).join(','))
  rows.push('')

  // Location / proximity targeting
  if (targetingType === 'radius' && radiusCoords) {
    rows.push('# Proximity')
    rows.push(['Campaign', 'Latitude', 'Longitude', 'Radius', 'Radius units', 'Bid adjustment'].map(csvCell).join(','))
    rows.push([
      campaignName,
      radiusCoords.lat.toFixed(6),
      radiusCoords.lng.toFixed(6),
      String(radiusKm),
      'Kilometers',
      '0',
    ].map(csvCell).join(','))
  } else {
    rows.push('# Location')
    rows.push(['Campaign', 'Location', 'Bid adjustment'].map(csvCell).join(','))
    if (targetingType === 'postcodes' && postcodes.length > 0) {
      for (const pc of postcodes) {
        rows.push([campaignName, pc, '0'].map(csvCell).join(','))
      }
    } else if (location.trim()) {
      rows.push([campaignName, location.trim(), '0'].map(csvCell).join(','))
    }
  }
  rows.push('')

  // Ad Group
  rows.push('# Ad Group')
  rows.push(['Campaign', 'Ad group', 'Max CPC', 'Status'].map(csvCell).join(','))
  rows.push([campaignName, adGroupName, maxCpc, 'Enabled'].map(csvCell).join(','))
  rows.push('')

  // Keywords
  rows.push('# Keyword')
  rows.push(['Campaign', 'Ad group', 'Keyword', 'Match type', 'Max CPC', 'Status'].map(csvCell).join(','))
  for (const kw of activeKws) {
    rows.push([campaignName, adGroupName, kw.text, kw.matchType, kw.cpcEuros.toFixed(2), 'Enabled'].map(csvCell).join(','))
  }
  rows.push('')

  // Responsive Search Ad
  const hls   = [...headlines,    ...Array(15).fill('')].slice(0, 15)
  const descs = [...descriptions, ...Array(4) .fill('')].slice(0, 4)
  rows.push('# Responsive Search Ad')
  const adHeaders = [
    'Campaign', 'Ad group',
    ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    ...Array.from({ length: 4  }, (_, i) => `Description ${i + 1}`),
    'Final URL', 'Status',
  ]
  rows.push(adHeaders.map(csvCell).join(','))
  rows.push([campaignName, adGroupName, ...hls, ...descs, finalUrl, 'Enabled'].map(csvCell).join(','))

  return rows.join('\n')
}

// ─── Sub-component: keyword row ──────────────────────────────────────────────

function KeywordRow({
  kw, currency, onToggle, onCycle,
}: {
  kw:       BuilderKeyword
  currency: string
  onToggle: (id: string) => void
  onCycle:  (id: string) => void
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
      kw.included
        ? 'bg-navy-800 border-navy-700'
        : 'bg-navy-900 border-navy-800 opacity-40'
    }`}>
      <input
        type="checkbox"
        checked={kw.included}
        onChange={() => onToggle(kw.id)}
        className="w-4 h-4 accent-mustard shrink-0 cursor-pointer"
      />
      <span className={`flex-1 text-sm truncate ${kw.included ? 'text-white' : 'text-slate-500'}`}>
        {kw.text}
      </span>
      <button
        onClick={() => onCycle(kw.id)}
        title="Click to cycle match type"
        className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${MATCH_STYLE[kw.matchType]}`}
      >
        {kw.matchType}
      </button>
      <span className="text-slate-600 text-xs tabular-nums w-16 text-right shrink-0">
        ~{currency}{kw.cpcEuros.toFixed(2)}/click
      </span>
    </div>
  )
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export function CampaignBuilderWizard({
  data,
  onClose,
  seedKeywords = [],
}: {
  data:          AdsData
  onClose:       () => void
  seedKeywords?: SelectedKeyword[]
}) {
  const [step, setStep] = useState<BuilderStep>(1)

  // ── Step 5: Create status ─────────────────────────────────────────────────
  type CreateStatus = 'idle' | 'creating' | 'success' | 'error'
  const [createStatus,     setCreateStatus]     = useState<CreateStatus>('idle')
  const [createError,      setCreateError]      = useState('')
  const [createdCustomerId, setCreatedCustomerId] = useState('')
  const [createdCampaignId, setCreatedCampaignId] = useState('')

  // ── Step 1: Goal ─────────────────────────────────────────────────────────
  const [goal, setGoal] = useState<Goal>('leads')

  // ── Step 2: Settings ─────────────────────────────────────────────────────
  const [campaignName,   setCampaignName]   = useState('New Search Campaign')
  const [dailyBudget,    setDailyBudget]    = useState(20)
  const [location,       setLocation]       = useState('Stockholm')
  const [targetingType,  setTargetingType]  = useState<TargetingType>('region')
  const [postcodes,      setPostcodes]      = useState<string[]>([])
  const [postcodeInput,  setPostcodeInput]  = useState('')
  const [radiusAddress,  setRadiusAddress]  = useState('')
  const [radiusKm,       setRadiusKm]       = useState(10)
  const [radiusCoords,   setRadiusCoords]   = useState<RadiusCoords | null>(null)
  const [radiusLoading,  setRadiusLoading]  = useState(false)
  const [radiusError,    setRadiusError]    = useState('')
  const [finalUrl,       setFinalUrl]       = useState('https://')

  // ── Step 3: Keywords ─────────────────────────────────────────────────────
  const fromGenerator = seedKeywords.length > 0
  const [keywords, setKeywords] = useState<BuilderKeyword[]>(() => {
    if (seedKeywords.length > 0) {
      return seedKeywords.map((k, i) => ({
        id:        `gen-${i}-${k.text}`,
        text:      k.text,
        matchType: k.matchType,
        cpcEuros:  Math.max(k.cpcMicros / 1_000_000, 0.5),
        source:    'recommended' as const,
        included:  true,
      }))
    }
    const existing = data.keywords
      .filter(k => k.conversions > 0 || k.clicks >= 2)
      .slice(0, 8)
      .map(k => ({
        id:        `ex-${k.keyword}`,
        text:      k.keyword,
        matchType: 'Exact' as MatchType,
        cpcEuros:  Math.max(k.avgCpcMicros / 1_000_000, 0.5),
        source:    'existing' as const,
        included:  true,
      }))
    const recommended = data.recommendedKeywords.map(k => ({
      id:        `rec-${k.keyword}`,
      text:      k.keyword,
      matchType: 'Phrase' as MatchType,
      cpcEuros:  Math.max(k.avgCpcMicros / 1_000_000, 0.5),
      source:    'recommended' as const,
      included:  true,
    }))
    return [...existing, ...recommended]
  })
  const [newKwInput, setNewKwInput] = useState('')

  function addCustomKeyword() {
    const text = newKwInput.trim()
    if (!text) return
    setKeywords(prev => [
      ...prev,
      {
        id:        `custom-${Date.now()}`,
        text,
        matchType: 'Phrase',
        cpcEuros:  3.00,
        source:    'custom',
        included:  true,
      },
    ])
    setNewKwInput('')
  }

  async function geocodeAddress() {
    const q = radiusAddress.trim()
    if (!q) return
    setRadiusLoading(true)
    setRadiusError('')
    setRadiusCoords(null)
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=0`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (!data.length) {
        setRadiusError('Location not found — try a more specific address or city name.')
      } else {
        setRadiusCoords({
          lat:         parseFloat(data[0].lat),
          lng:         parseFloat(data[0].lon),
          displayName: data[0].display_name,
        })
      }
    } catch {
      setRadiusError('Could not reach the geocoding service. Check your connection and try again.')
    } finally {
      setRadiusLoading(false)
    }
  }

  function addPostcode(raw: string) {
    const candidates = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
    setPostcodes(prev => {
      const next = [...prev]
      for (const pc of candidates) {
        if (!next.includes(pc)) next.push(pc)
      }
      return next
    })
    setPostcodeInput('')
  }

  function removePostcode(pc: string) {
    setPostcodes(prev => prev.filter(p => p !== pc))
  }

  // ── Step 4: Ad copy ──────────────────────────────────────────────────────
  const [headlines,    setHeadlines]    = useState<string[]>(['', '', ''])
  const [descriptions, setDescriptions] = useState<string[]>(['', ''])

  function setHeadline(i: number, v: string) {
    setHeadlines(prev => prev.map((h, idx) => idx === i ? v.slice(0, 30) : h))
  }
  function setDescription(i: number, v: string) {
    setDescriptions(prev => prev.map((d, idx) => idx === i ? v.slice(0, 90) : d))
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const includedKws   = keywords.filter(k => k.included)
  const filledHls     = headlines.filter(h => h.trim())
  const filledDescs   = descriptions.filter(d => d.trim())

  const canProceed: Record<BuilderStep, boolean> = {
    1: true,
    2: !!campaignName.trim() && dailyBudget > 0 && finalUrl.startsWith('http') && (
         targetingType === 'region'    ? !!location.trim()       :
         targetingType === 'postcodes' ? postcodes.length > 0    :
         /* radius */                    radiusCoords !== null
       ),
    3: includedKws.length >= 1,
    4: filledHls.length >= 3 && filledDescs.length >= 2,
    5: true,
  }

  // ── Export ───────────────────────────────────────────────────────────────

  async function createCampaignInGoogle() {
    setCreateStatus('creating')
    setCreateError('')
    try {
      const res = await fetch('/api/ads/create-campaign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          dailyBudget,
          goal,
          targetingType,
          location,
          postcodes,
          radiusCoords,
          radiusKm,
          keywords:     includedKws.map(k => ({ text: k.text, matchType: k.matchType, cpcEuros: k.cpcEuros })),
          headlines:    filledHls,
          descriptions: filledDescs,
          finalUrl,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Campaign creation failed')
      setCreatedCustomerId(json.customerId)
      setCreatedCampaignId(json.campaignId)
      setCreateStatus('success')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong')
      setCreateStatus('error')
    }
  }

  function downloadCSV() {
    const csv  = generateAdsEditorCSV({ campaignName, dailyBudget, goal, location, targetingType, postcodes, radiusCoords, radiusKm, keywords, headlines, descriptions, finalUrl, currency: data.currency })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `kiterank-campaign-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-navy-950 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-navy-700 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-1 -ml-1 text-slate-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-semibold text-sm">
              New Search Campaign
            </h1>
            <p className="text-slate-500 text-xs">Step {step} of 5 — {STEP_LABELS[step - 1]}</p>
          </div>
        </div>

        {/* Step tracker */}
        <div className="hidden sm:flex items-center gap-2">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all ${
                step === i + 1
                  ? 'bg-mustard text-navy-950 border-mustard'
                  : step > i + 1
                  ? 'bg-mustard/20 text-mustard border-mustard/30'
                  : 'bg-navy-800 text-slate-600 border-navy-700'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`w-6 h-px transition-colors ${step > i + 1 ? 'bg-mustard/30' : 'bg-navy-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">

          {/* ── Step 1: Goal ──────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">What should this campaign achieve?</h2>
                <p className="text-slate-400 text-sm mt-1">This determines the bidding strategy Google uses to spend your budget.</p>
              </div>
              <div className="space-y-3">
                {GOAL_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setGoal(opt.id)}
                    className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                      goal === opt.id
                        ? 'border-mustard bg-mustard/5'
                        : 'border-navy-700 bg-navy-800 hover:border-navy-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl mt-0.5 shrink-0">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm">{opt.title}</p>
                          {goal === opt.id && (
                            <span className="text-[10px] font-bold text-mustard bg-mustard/10 border border-mustard/20 px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{opt.desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 mt-1 shrink-0 flex items-center justify-center transition-colors ${
                        goal === opt.id ? 'border-mustard bg-mustard' : 'border-slate-700'
                      }`}>
                        {goal === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-navy-950" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Settings ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Campaign settings</h2>
                <p className="text-slate-400 text-sm mt-1">These can all be edited in Google Ads after import.</p>
              </div>

              <Field label="Campaign name">
                <input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="t.ex. Balayage Södermalm — Bokningar — Sök"
                  className="w-full bg-navy-800 border border-navy-700 focus:border-mustard/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-slate-600"
                />
              </Field>

              <Field label="Daily budget" hint={`${data.currency} ${(dailyBudget * 30.4).toFixed(0)} estimated per month`}>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">{data.currency}</span>
                  <input
                    type="number"
                    min={1}
                    value={dailyBudget}
                    onChange={e => setDailyBudget(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-navy-800 border border-navy-700 focus:border-mustard/50 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none transition-colors"
                  />
                </div>
                <p className="text-slate-600 text-xs mt-1.5">
                  Start conservative — you can raise it once you see results. Google may spend up to 2× on high-demand days but stays within the monthly total.
                </p>
              </Field>

              {/* Target location + targeting type */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400">Target location</label>
                </div>

                {/* Targeting type toggle */}
                <div className="flex gap-2 flex-wrap">
                  {([
                    { id: 'region',    label: 'City / region / country' },
                    { id: 'postcodes', label: 'Specific postcodes'       },
                    { id: 'radius',    label: 'Radius around a point'    },
                  ] as { id: TargetingType; label: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTargetingType(opt.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        targetingType === opt.id
                          ? 'bg-mustard/10 border-mustard/40 text-mustard'
                          : 'bg-navy-800 border-navy-700 text-slate-400 hover:text-slate-300 hover:border-navy-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Region input */}
                {targetingType === 'region' && (
                  <>
                    <input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Stockholm, Gothenburg, Sweden"
                      className="w-full bg-navy-800 border border-navy-700 focus:border-mustard/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-slate-600"
                    />
                    <p className="text-slate-600 text-xs">City, region, or country. Radius targeting is available directly inside Google Ads after import.</p>
                  </>
                )}

                {/* Radius input */}
                {targetingType === 'radius' && (
                  <div className="space-y-3">
                    {/* Address lookup */}
                    <div className="flex gap-2">
                      <input
                        value={radiusAddress}
                        onChange={e => { setRadiusAddress(e.target.value); setRadiusCoords(null); setRadiusError('') }}
                        onKeyDown={e => e.key === 'Enter' && geocodeAddress()}
                        placeholder="e.g. Stockholm City Centre, Kungsgatan 10 Stockholm"
                        className="flex-1 bg-navy-800 border border-navy-700 focus:border-mustard/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-slate-600"
                      />
                      <button
                        onClick={geocodeAddress}
                        disabled={!radiusAddress.trim() || radiusLoading}
                        className="px-4 py-2.5 bg-navy-800 border border-navy-700 hover:border-mustard/30 text-slate-300 hover:text-white text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
                      >
                        {radiusLoading ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                          </svg>
                        ) : 'Look up'}
                      </button>
                    </div>

                    {/* Error */}
                    {radiusError && (
                      <p className="text-red-400 text-xs">{radiusError}</p>
                    )}

                    {/* Confirmed coords */}
                    {radiusCoords && (
                      <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 text-xs">✓</span>
                          <p className="text-white text-sm font-medium truncate">
                            {radiusCoords.displayName.split(',').slice(0, 2).join(',')}
                          </p>
                        </div>
                        <p className="text-slate-500 text-xs tabular-nums pl-4">
                          {radiusCoords.lat.toFixed(5)}° N, {radiusCoords.lng.toFixed(5)}° E
                        </p>
                      </div>
                    )}

                    {/* Radius slider + live map — only shown once coords are confirmed */}
                    {radiusCoords && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-slate-400">Radius</label>
                          <span className="text-white text-sm font-semibold tabular-nums">{radiusKm} km</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={75}
                          step={1}
                          value={radiusKm}
                          onChange={e => setRadiusKm(Number(e.target.value))}
                          className="w-full accent-mustard cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>1 km</span>
                          <span className="text-slate-500 text-xs">
                            {radiusKm <= 5  ? 'Tight — a few city blocks'  :
                             radiusKm <= 15 ? 'Local neighbourhood area'   :
                             radiusKm <= 30 ? 'Typical service radius'     :
                                             'Wide regional coverage'}
                          </span>
                          <span>75 km</span>
                        </div>

                        {/* Live map preview */}
                        <RadiusMap
                          lat={radiusCoords.lat}
                          lng={radiusCoords.lng}
                          radiusKm={radiusKm}
                        />
                      </div>
                    )}

                    <p className="text-slate-600 text-xs">
                      Coordinates are resolved via OpenStreetMap and written to the campaign file as lat/lng — the format Google Ads Editor requires for radius targeting.
                    </p>
                  </div>
                )}

                {/* Postcode input */}
                {targetingType === 'postcodes' && (
                  <div className="space-y-2">
                    {/* Tag chips */}
                    {postcodes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-3 bg-navy-800 border border-navy-700 rounded-xl min-h-[44px]">
                        {postcodes.map(pc => (
                          <span
                            key={pc}
                            className="inline-flex items-center gap-1.5 bg-navy-700 border border-navy-600 text-white text-xs px-2.5 py-1 rounded-lg"
                          >
                            {pc}
                            <button
                              onClick={() => removePostcode(pc)}
                              className="text-slate-500 hover:text-white transition-colors leading-none"
                              aria-label={`Remove ${pc}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add input */}
                    <div className="flex gap-2">
                      <input
                        value={postcodeInput}
                        onChange={e => setPostcodeInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            if (postcodeInput.trim()) addPostcode(postcodeInput)
                          }
                        }}
                        placeholder="e.g. 11120  —  press Enter or comma to add"
                        className="flex-1 bg-navy-800 border border-navy-700 focus:border-mustard/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-slate-600"
                      />
                      <button
                        onClick={() => postcodeInput.trim() && addPostcode(postcodeInput)}
                        disabled={!postcodeInput.trim()}
                        className="px-4 py-2.5 bg-navy-800 border border-navy-700 hover:border-navy-600 text-slate-300 hover:text-white text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-slate-600 text-xs">
                      Each postcode becomes a separate location target in the campaign.
                      You can also paste a comma-separated list and hit Enter.
                    </p>
                  </div>
                )}
              </div>

              <Field label="Landing page URL">
                <input
                  value={finalUrl}
                  onChange={e => setFinalUrl(e.target.value)}
                  placeholder="https://yoursite.com/contact"
                  className="w-full bg-navy-800 border border-navy-700 focus:border-mustard/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-slate-600 font-mono"
                />
                <p className="text-slate-600 text-xs mt-1.5">A dedicated service or contact page converts better than a homepage — the page content should match the keywords you are bidding on.</p>
              </Field>
            </div>
          )}

          {/* ── Step 3: Keywords ──────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Keywords</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {fromGenerator
                    ? 'Pre-loaded from the keyword generator. Uncheck any you want to exclude. Click a match-type badge to cycle it.'
                    : 'Pre-filled from your account data and gap analysis. Uncheck any you want to exclude. Click a match-type badge to cycle it.'}
                </p>
              </div>

              <div className="bg-navy-800/50 border border-navy-700 rounded-xl px-4 py-3 text-xs text-slate-400 space-y-1">
                <p><span className="text-green-400 font-semibold">Exact</span> — only shows for that specific search. Lowest waste, highest relevance.</p>
                <p><span className="text-blue-400 font-semibold">Phrase</span> — shows for searches that include the phrase. Good middle ground.</p>
                <p><span className="text-orange-400 font-semibold">Broad</span> — shows for loosely related searches. Widest reach, needs tighter negative keyword control.</p>
              </div>

              {keywords.some(k => k.source === 'existing') && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">From your current account</p>
                  {keywords.filter(k => k.source === 'existing').map(kw => (
                    <KeywordRow
                      key={kw.id}
                      kw={kw}
                      currency={data.currency}
                      onToggle={id => setKeywords(prev => prev.map(k => k.id === id ? { ...k, included: !k.included } : k))}
                      onCycle={id  => setKeywords(prev => prev.map(k => k.id === id ? { ...k, matchType: MATCH_CYCLE[k.matchType] } : k))}
                    />
                  ))}
                </div>
              )}

              {keywords.some(k => k.source === 'recommended') && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest">
                    {fromGenerator ? 'From keyword generator' : 'Gaps — searches you are not currently buying'}
                  </p>
                  {keywords.filter(k => k.source === 'recommended').map(kw => (
                    <KeywordRow
                      key={kw.id}
                      kw={kw}
                      currency={data.currency}
                      onToggle={id => setKeywords(prev => prev.map(k => k.id === id ? { ...k, included: !k.included } : k))}
                      onCycle={id  => setKeywords(prev => prev.map(k => k.id === id ? { ...k, matchType: MATCH_CYCLE[k.matchType] } : k))}
                    />
                  ))}
                </div>
              )}

              {keywords.some(k => k.source === 'custom') && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Added by you</p>
                  {keywords.filter(k => k.source === 'custom').map(kw => (
                    <KeywordRow
                      key={kw.id}
                      kw={kw}
                      currency={data.currency}
                      onToggle={id => setKeywords(prev => prev.map(k => k.id === id ? { ...k, included: !k.included } : k))}
                      onCycle={id  => setKeywords(prev => prev.map(k => k.id === id ? { ...k, matchType: MATCH_CYCLE[k.matchType] } : k))}
                    />
                  ))}
                </div>
              )}

              {/* Add custom keyword */}
              <div className="flex gap-2 pt-1">
                <input
                  value={newKwInput}
                  onChange={e => setNewKwInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomKeyword()}
                  placeholder="Add a keyword…"
                  className="flex-1 bg-navy-800 border border-navy-700 focus:border-mustard/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-slate-600"
                />
                <button
                  onClick={addCustomKeyword}
                  disabled={!newKwInput.trim()}
                  className="px-4 py-2.5 bg-navy-800 border border-navy-700 hover:border-navy-600 text-slate-300 hover:text-white text-sm rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              <p className="text-slate-600 text-xs">{includedKws.length} keyword{includedKws.length !== 1 ? 's' : ''} selected</p>
            </div>
          )}

          {/* ── Step 4: Ad copy ───────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-7">
              <div>
                <h2 className="text-xl font-bold text-white">Ad copy</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Google rotates your headlines and descriptions automatically, learning which combinations perform best for each search.
                </p>
              </div>

              {/* Headlines */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Headlines — 3 required · max 30 characters each
                </p>
                {headlines.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={h}
                      onChange={e => setHeadline(i, e.target.value)}
                      placeholder={
                        i === 0 ? 't.ex. Balayage på Södermalm' :
                        i === 1 ? 'e.g. Same-Day Callout Available'  :
                                  'e.g. Free Quote · No Hidden Fees'
                      }
                      className={`flex-1 bg-navy-800 border rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-slate-600 ${
                        h.length >= 27 ? 'border-mustard/50' : 'border-navy-700 focus:border-mustard/40'
                      }`}
                    />
                    <span className={`text-xs tabular-nums w-6 text-right shrink-0 ${
                      h.length > 27 ? 'text-mustard' : 'text-slate-700'
                    }`}>
                      {30 - h.length}
                    </span>
                  </div>
                ))}
                {headlines.length < 15 && (
                  <button
                    onClick={() => setHeadlines(prev => [...prev, ''])}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    + Add another headline ({15 - headlines.length} remaining)
                  </button>
                )}
              </div>

              {/* Descriptions */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Descriptions — 2 required · max 90 characters each
                </p>
                {descriptions.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <textarea
                      value={d}
                      onChange={e => setDescription(i, e.target.value)}
                      placeholder={
                        i === 0
                          ? 't.ex. Färgspecialist på Södermalm. Konsultation ingår, boka online och se lediga tider direkt.'
                          : 't.ex. Balayage, slingor och toning. Boka online — vi har tider kvar den här veckan.'
                      }
                      rows={2}
                      className={`flex-1 bg-navy-800 border rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-slate-600 ${
                        d.length >= 82 ? 'border-mustard/50' : 'border-navy-700 focus:border-mustard/40'
                      }`}
                    />
                    <span className={`text-xs tabular-nums w-6 text-right shrink-0 mt-3 ${
                      d.length > 82 ? 'text-mustard' : 'text-slate-700'
                    }`}>
                      {90 - d.length}
                    </span>
                  </div>
                ))}
                {descriptions.length < 4 && (
                  <button
                    onClick={() => setDescriptions(prev => [...prev, ''])}
                    className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    + Add another description ({4 - descriptions.length} remaining)
                  </button>
                )}
              </div>

              {/* ── Google Search ad preview ─────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  How it looks in Google Search
                </p>

                <div className="bg-white rounded-xl p-5 font-sans select-none">

                  {/* Sponsored badge */}
                  <div className="mb-2">
                    <span className="text-[11px] text-[#70757a] border border-[#dadce0] rounded px-1.5 py-px font-medium leading-none">
                      Sponsored
                    </span>
                  </div>

                  {/* Favicon + domain row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-[#f1f3f4] border border-[#dadce0] flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-[#5f6368] uppercase leading-none">
                        {(finalUrl.replace(/^https?:\/\//, '').split('/')[0] || 'Y').charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#202124] text-xs font-medium leading-none truncate">
                        {finalUrl.replace(/^https?:\/\//, '').split('/')[0] || 'yoursite.com'}
                      </p>
                      <p className="text-[#4d5156] text-[10px] leading-none mt-0.5 truncate">
                        {finalUrl.replace(/^https?:\/\//, '') || 'yoursite.com/contact'}
                      </p>
                    </div>
                  </div>

                  {/* Headline 1 */}
                  <p className={`text-xl leading-snug mb-1 ${
                    headlines[0].trim() ? 'text-[#1a0dab]' : 'text-[#c5cae9]'
                  }`}>
                    {headlines[0].trim() || 'Your first headline appears here'}
                  </p>

                  {/* Description 1 */}
                  <p className={`text-sm leading-relaxed ${
                    descriptions[0].trim() ? 'text-[#4d5156]' : 'text-[#c5cae9] italic'
                  }`}>
                    {descriptions[0].trim() || 'Your first description line will appear here. Tell the customer what you offer and why they should click.'}
                  </p>

                </div>

                <p className="text-slate-600 text-xs">
                  Google combines your headlines and descriptions automatically — this shows the first of each.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 5: Launch ────────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-6">

              {/* ── Success state ──────────────────────────────────────── */}
              {createStatus === 'success' ? (
                <>
                  <div className="text-center py-4 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                      <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Campaign created</h2>
                    <p className="text-slate-400 text-sm max-w-sm mx-auto">
                      <strong className="text-white">{campaignName}</strong> is ready in Google Ads in paused status. Review it there and click Enable when you&apos;re ready to go live.
                    </p>
                  </div>

                  <ExternalLink
                    href={`https://ads.google.com/aw/campaigns?ocid=${createdCustomerId}`}
                    className="w-full flex items-center justify-center gap-2.5 bg-mustard hover:bg-mustard-light text-navy-950 font-semibold py-4 rounded-xl transition-colors text-sm"
                  >
                    Review &amp; enable in Google Ads
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </ExternalLink>

                  <div className="bg-mustard/5 border border-mustard/15 rounded-xl px-4 py-3.5">
                    <p className="text-mustard text-xs font-semibold">After launch</p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      Allow 48–72 hours before drawing conclusions — Google&apos;s bidding algorithm needs time to calibrate. Return here to monitor spend, cost per lead, and wasted keywords as data flows in.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold text-white">Ready to launch</h2>
                    <p className="text-slate-400 text-sm mt-1">
                      The campaign will be created in Google Ads in <strong className="text-white">paused status</strong> — nothing goes live until you enable it there.
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5 space-y-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Campaign summary</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { label: 'Name',         value: campaignName || '—' },
                        { label: 'Goal',         value: GOAL_LABEL[goal]    },
                        { label: 'Daily budget', value: `${data.currency} ${dailyBudget}/day` },
                        {
                          label: 'Location',
                          value: targetingType === 'postcodes'
                            ? postcodes.length > 0
                              ? `${postcodes.length} postcode${postcodes.length !== 1 ? 's' : ''} (${postcodes.slice(0, 3).join(', ')}${postcodes.length > 3 ? '…' : ''})`
                              : '—'
                            : targetingType === 'radius'
                              ? radiusCoords
                                ? `${radiusKm} km radius — ${radiusCoords.displayName.split(',').slice(0, 2).join(',')}`
                                : '—'
                              : location || '—',
                        },
                        { label: 'Keywords', value: `${includedKws.length} selected` },
                        { label: 'Ad copy',  value: `${filledHls.length} headlines · ${filledDescs.length} descriptions` },
                      ].map(row => (
                        <div key={row.label}>
                          <p className="text-slate-500 text-xs">{row.label}</p>
                          <p className="text-white text-sm font-medium mt-0.5">{row.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {createStatus === 'error' && (
                    <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
                      <p className="text-red-400 text-sm font-medium">Creation failed</p>
                      <p className="text-red-300/70 text-xs mt-1 font-mono leading-relaxed">{createError}</p>
                    </div>
                  )}

                  {/* Primary CTA */}
                  <button
                    onClick={createCampaignInGoogle}
                    disabled={createStatus === 'creating'}
                    className="w-full flex items-center justify-center gap-2.5 bg-mustard hover:bg-mustard-light text-navy-950 font-semibold py-4 rounded-xl transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createStatus === 'creating' ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                        </svg>
                        Creating campaign…
                      </>
                    ) : (
                      'Create & review in Google Ads →'
                    )}
                  </button>

                  {/* CSV fallback */}
                  <div className="text-center">
                    <button
                      onClick={downloadCSV}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                    >
                      Download as CSV instead
                    </button>
                  </div>
                </>
              )}

            </div>
          )}

        </div>
      </div>

      {/* ── Footer navigation ───────────────────────────────────────────── */}
      <div className="border-t border-navy-700 px-6 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => step > 1 ? setStep(s => (s - 1) as BuilderStep) : onClose()}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {step > 1 ? 'Back' : 'Cancel'}
        </button>

        {step < 5 ? (
          <button
            onClick={() => setStep(s => (s + 1) as BuilderStep)}
            disabled={!canProceed[step]}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-mustard hover:bg-mustard-light text-navy-950 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-navy-700 hover:border-navy-600 text-slate-300 hover:text-white text-sm rounded-xl transition-colors"
          >
            Done
          </button>
        )}
      </div>

    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label:    string
  hint?:    string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        {hint && <span className="text-xs text-slate-600">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
