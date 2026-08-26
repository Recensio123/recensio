'use client'
import { useState, useMemo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { type KeywordSuggestion, type MatchType } from './types'

type Props = {
  existingKeywords:     string[]    // keywords already in account — skipped in generation
  companyIndustry?:     string
  companyCity?:         string
  companyCountry?:      string
  currency:             string
  onAddToCampaign:      (keywords: SelectedKeyword[]) => void
}

export type SelectedKeyword = {
  text:      string
  matchType: MatchType
  cpcMicros: number
}

const MATCH_STYLE: Record<string, string> = {
  Exact:  'text-green-400 bg-green-500/10 border-green-500/20',
  Phrase: 'text-blue-400  bg-blue-500/10  border-blue-500/20',
}

const PRIORITY_STYLE: Record<string, string> = {
  High:   'text-mustard  bg-mustard/10  border-mustard/20',
  Medium: 'text-slate-400 bg-navy-700   border-navy-600',
}

export function KeywordGeneratorPanel({
  existingKeywords,
  companyIndustry = '',
  companyCity     = '',
  companyCountry  = '',
  currency,
  onAddToCampaign,
}: Props) {
  const [isOpen,       setIsOpen]       = useState(false)
  const [businessType, setBusinessType] = useState(companyIndustry)
  const [location,     setLocation]     = useState(companyCity)
  const [services,     setServices]     = useState('')
  const [status,       setStatus]       = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [suggestions,  setSuggestions]  = useState<KeywordSuggestion[]>([])
  const [selected,     setSelected]     = useState<Set<string>>(new Set())

  // Group by category preserving generation order
  const grouped = useMemo(() => {
    const map = new Map<string, KeywordSuggestion[]>()
    for (const s of suggestions) {
      const arr = map.get(s.category) ?? []
      arr.push(s)
      map.set(s.category, arr)
    }
    return map
  }, [suggestions])

  const selectedCount   = selected.size
  const highPriorityIds = new Set(suggestions.filter(s => s.priority === 'High').map(s => s.keyword))

  async function generate() {
    if (!businessType.trim() || !location.trim()) return
    setStatus('loading')
    setErrorMsg('')
    setSuggestions([])
    setSelected(new Set())

    try {
      const res  = await fetch('/api/ai/keyword-suggestions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          businessType: businessType.trim(),
          location:     location.trim(),
          services:     services.trim() || undefined,
          country:      companyCountry || undefined,
          currency,
          existingKeywords,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Generation failed')

      const kws: KeywordSuggestion[] = json.keywords ?? []
      setSuggestions(kws)
      // Auto-select all High-priority keywords
      setSelected(new Set(kws.filter(k => k.priority === 'High').map(k => k.keyword)))
      setStatus('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  function toggleAll() {
    if (selected.size === suggestions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(suggestions.map(s => s.keyword)))
    }
  }

  function selectHighOnly() {
    setSelected(new Set(highPriorityIds))
  }

  function handleAdd() {
    const kws: SelectedKeyword[] = suggestions
      .filter(s => selected.has(s.keyword))
      .map(s => ({
        text:      s.keyword,
        matchType: s.matchType as MatchType,
        cpcMicros: s.cpcMicros,
      }))
    if (kws.length > 0) onAddToCampaign(kws)
  }

  return (
    <div className={`rounded-xl border transition-all ${
      isOpen ? 'border-mustard/30 bg-navy-800' : 'border-navy-700 bg-navy-800'
    }`}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-mustard text-lg">✦</span>
          <div>
            <p className="text-white text-sm font-semibold">Keyword ideas for your business</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {status === 'done'
                ? `${suggestions.length} keywords generated — ${selectedCount} selected`
                : 'Get a curated list of high-intent keywords based on your business'}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-5 border-t border-navy-700 pt-4">

          {/* Input form */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500">Business type</label>
              <input
                type="text"
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
                placeholder="t.ex. Frisör, Nagelsalong, Massör"
                className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500">City or area</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Stockholm, Södermalm"
                className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <Tooltip text="Optional — listing specific services you offer helps generate more targeted keywords. Separate with commas.">
                <label className="text-xs text-slate-500 cursor-default">Specific services (optional)</label>
              </Tooltip>
              <input
                type="text"
                value={services}
                onChange={e => setServices(e.target.value)}
                placeholder="t.ex. balayage, keratinbehandling"
                className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={!businessType.trim() || !location.trim() || status === 'loading'}
            className="flex items-center gap-2 text-sm bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            {status === 'loading' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                </svg>
                Analysing your market…
              </>
            ) : status === 'done' ? (
              '↺ Regenerate'
            ) : (
              '✦ Generate keyword ideas'
            )}
          </button>

          {status === 'error' && (
            <p className="text-red-400 text-sm">{errorMsg || 'Failed to generate keywords. Try again.'}</p>
          )}

          {/* Results */}
          {status === 'done' && suggestions.length > 0 && (
            <div className="space-y-5">

              {/* Selection controls */}
              <div className="flex items-center gap-3">
                <button onClick={selectHighOnly} className="text-xs text-mustard hover:text-mustard-light transition-colors">
                  Select high-priority only
                </button>
                <span className="text-slate-700">·</span>
                <button onClick={toggleAll} className="text-xs text-slate-400 hover:text-white transition-colors">
                  {selected.size === suggestions.length ? 'Deselect all' : 'Select all'}
                </button>
                <span className="ml-auto text-xs text-slate-500">{selectedCount} of {suggestions.length} selected</span>
              </div>

              {/* Keyword cards grouped by category */}
              {Array.from(grouped.entries()).map(([category, kws]) => (
                <div key={category}>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {category}
                  </p>
                  <div className="space-y-1.5">
                    {kws.map(kw => {
                      const isSelected = selected.has(kw.keyword)
                      return (
                        <div
                          key={kw.keyword}
                          onClick={() => setSelected(s => {
                            const n = new Set(s)
                            isSelected ? n.delete(kw.keyword) : n.add(kw.keyword)
                            return n
                          })}
                          className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-navy-900 border-navy-600'
                              : 'bg-navy-900/40 border-navy-700/50 opacity-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-mustard border-mustard' : 'border-navy-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-navy-950" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>

                          {/* Keyword + reason */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white text-sm font-medium">{kw.keyword}</span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${MATCH_STYLE[kw.matchType]}`}>
                                {kw.matchType}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[kw.priority]}`}>
                                {kw.priority}
                              </span>
                            </div>
                            <p className="text-slate-500 text-xs mt-1 leading-relaxed">{kw.reason}</p>
                          </div>

                          {/* CPC */}
                          <div className="shrink-0 text-right">
                            <Tooltip text="Estimated cost per click for this keyword in your market. Actual costs will vary based on your quality score and competition.">
                              <p className="text-slate-400 text-xs tabular-nums cursor-default">{kw.cpcDisplay}</p>
                            </Tooltip>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Action footer */}
              <div className="flex items-center gap-4 pt-2 border-t border-navy-700">
                <button
                  onClick={handleAdd}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-2 text-sm bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  Build campaign with {selectedCount} keyword{selectedCount !== 1 ? 's' : ''} →
                </button>
                <p className="text-xs text-slate-600">
                  Opens the Campaign Builder with your selected keywords pre-loaded
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
