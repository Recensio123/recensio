'use client'
import { useState } from 'react'
import { type AdsData, type CampaignStatus } from './types'
import { fmtMicros } from './helpers'
import { type Period } from '@/components/dashboard/PeriodSelector'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { useCoverage } from '@/components/DataCoverageProvider'

// Tooltip texts for numbers and badges a rookie could misread
const T: Record<string, { sv: string; en: string }> = {
  status: {
    sv: 'Kampanjens läge. Klicka för att pausa eller starta den. En pausad kampanj kostar ingenting men syns inte heller.',
    en: 'The campaign state. Click to pause or resume it. A paused campaign costs nothing but is not shown either.',
  },
  spend: {
    sv: 'Vad kampanjen kostat hittills denna månad. Jämför alltid med kundkolumnen bredvid.',
    en: 'What the campaign has cost so far this month. Always compare with the customer column next to it.',
  },
  customers: {
    sv: 'Hur många kunder kampanjen gett och vad varje kund kostade i annonspengar.',
    en: 'How many customers the campaign produced and what each one cost in ad spend.',
  },
  noCustomers: {
    sv: 'Kampanjen har inte gett några kunder ännu. Fäll ut raden för att se vilka sökord som drar kostnaden.',
    en: 'The campaign has not produced any customers yet. Expand the row to see which keywords are driving the cost.',
  },
  clicks: {
    sv: 'Antal klick på kampanjens annonser denna månad.',
    en: 'Number of clicks on the campaign ads this month.',
  },
  impressions: {
    sv: 'Hur många gånger kampanjens annonser visats på Google.',
    en: 'How many times the campaign ads were shown on Google.',
  },
  avgCpc: {
    sv: 'Vad du i snitt betalade varje gång någon klickade på en annons i kampanjen.',
    en: 'What you paid on average each time someone clicked an ad in this campaign.',
  },
  keywords: {
    sv: 'Hur många sökord kampanjen bjuder på. Alla detaljer finns på Sökord-fliken.',
    en: 'How many keywords the campaign bids on. Full details live on the Keywords tab.',
  },
  best: {
    sv: 'Sökordet som gett kampanjen flest kunder. Det ska få behålla eller öka sin budget.',
    en: 'The keyword that brought the campaign the most customers. It should keep or grow its budget.',
  },
  worst: {
    sv: 'Kampanjens dyraste sökord utan en enda kund. Överväg att pausa det på Sökord-fliken.',
    en: 'The campaign’s most expensive keyword without a single customer. Consider pausing it on the Keywords tab.',
  },
}

/*
 * Slimmed campaign list for the Test2 dashboard.
 * Status toggle and inline budget editing stay (they're actions you take here),
 * but the deep per-campaign detail (keyword tables, ads, schedule grids) is gone —
 * that content lives on the Keywords and Ads tabs; the expansion just summarises
 * and links there instead of restating everything.
 */

// Period-bound wording under the spend column — the numbers themselves arrive
// from the parent dashboard already scaled to the period and already trimmed
// to the stretch of Ads history we hold. When the selected period reaches
// further back than our record, the label says so instead of naming a period
// we only partly hold.
const SPENT_LABEL: Record<Period | 'SinceStart', { sv: string; en: string }> = {
  Weekly:     { sv: 'spenderat denna vecka', en: 'spent this week'        },
  Monthly:    { sv: 'spenderat denna månad', en: 'spent this month'       },
  Yearly:     { sv: 'spenderat i år',        en: 'spent this year'        },
  SinceStart: { sv: 'spenderat sedan start', en: 'spent since we started' },
}

type Props = {
  data:      AdsData
  period?:   Period
  onGoToTab: (tab: 'keywords' | 'ads') => void
}

export function CampaignsTabTest2({ data, period = 'Monthly', onGoToTab }: Props) {
  const { lang } = useLang()
  const sv = lang === 'sv'

  // Same record depth as the overview above, read here only to word the spend
  // column. The per-campaign flow figures arrive pre-trimmed from the parent,
  // and cost per customer below is recomputed from them — it is a ratio, so it
  // must not shrink along with the totals it is built from.
  const coverage  = useCoverage('ads', period)
  const spentKey  = coverage.state === 'since-start' ? 'SinceStart' : period

  const [overrides,    setOverrides]    = useState<Record<string, { status?: CampaignStatus; dailyBudgetMicros?: number }>>({})
  const [savingStatus, setSavingStatus] = useState<Record<string, boolean>>({})
  const [savingBudget, setSavingBudget] = useState<Record<string, boolean>>({})
  const [rowErrors,    setRowErrors]    = useState<Record<string, string>>({})
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [budgetDraft,  setBudgetDraft]  = useState('')
  const [expanded,     setExpanded]     = useState<string | null>(null)

  const failedMsg = sv ? 'Uppdateringen misslyckades' : 'Update failed'

  async function toggleStatus(e: React.MouseEvent, id: string, current: CampaignStatus) {
    e.stopPropagation()
    const next: CampaignStatus = current === 'Enabled' ? 'Paused' : 'Enabled'
    setSavingStatus(s => ({ ...s, [id]: true }))
    setRowErrors(r => ({ ...r, [id]: '' }))
    try {
      const res = await fetch('/api/ads/update-campaign', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', campaignId: id, status: next.toUpperCase() }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? failedMsg)
      setOverrides(o => ({ ...o, [id]: { ...o[id], status: next } }))
    } catch (err) {
      setRowErrors(r => ({ ...r, [id]: err instanceof Error ? err.message : failedMsg }))
    } finally {
      setSavingStatus(s => ({ ...s, [id]: false }))
    }
  }

  async function saveBudget(id: string, budgetId: string) {
    const micros = Math.round(parseFloat(budgetDraft.replace(',', '.')) * 1_000_000)
    if (isNaN(micros) || micros < 1_000_000) { setEditingId(null); return }
    setEditingId(null)
    setSavingBudget(s => ({ ...s, [id]: true }))
    try {
      const res = await fetch('/api/ads/update-campaign', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'budget', budgetId, dailyBudgetMicros: micros }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? failedMsg)
      setOverrides(o => ({ ...o, [id]: { ...o[id], dailyBudgetMicros: micros } }))
    } catch (err) {
      setRowErrors(r => ({ ...r, [id]: err instanceof Error ? err.message : failedMsg }))
    } finally {
      setSavingBudget(s => ({ ...s, [id]: false }))
    }
  }

  return (
    <div>
      <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{sv ? 'Dina kampanjer' : 'Your campaigns'}</h2>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden divide-y divide-navy-700/60">
            {data.campaigns.map(c => {
              const o        = overrides[c.campaignId] ?? {}
              const status   = o.status ?? c.status
              const budget   = o.dailyBudgetMicros ?? c.dailyBudgetMicros
              const isPaused = status === 'Paused'
              const saving   = savingStatus[c.campaignId] ?? false
              const isOpen   = expanded === c.campaignId
              const cpl      = c.conversions > 0 ? fmtMicros(c.spendMicros / c.conversions, data.currency) : null

              const campKeywords = data.keywords.filter(k => k.campaignId === c.campaignId)
              const best  = [...campKeywords].filter(k => k.conversions > 0).sort((a, b) => b.conversions - a.conversions)[0]
              const worst = [...campKeywords].filter(k => k.isWasted).sort((a, b) => b.spendMicros - a.spendMicros)[0]

              return (
                <div key={c.campaignId} className={isPaused ? 'opacity-60' : ''}>
                  {/* Row */}
                  <div
                    className="px-4 py-3.5 grid items-center gap-4 cursor-pointer hover:bg-navy-700/20 transition-colors"
                    style={{ gridTemplateColumns: '90px 1fr 120px 110px 140px 24px' }}
                    onClick={() => setExpanded(isOpen ? null : c.campaignId)}
                  >
                    {/* Status toggle */}
                    <div onClick={e => e.stopPropagation()}>
                      <Tooltip text={sv ? T.status.sv : T.status.en}>
                      <button
                        onClick={e => toggleStatus(e, c.campaignId, status)}
                        disabled={saving}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                          isPaused
                            ? 'text-slate-400 bg-navy-700 border-navy-600 hover:bg-navy-600 hover:text-white'
                            : 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
                        }`}
                      >
                        {saving ? '…' : isPaused ? (sv ? 'Pausad' : 'Paused') : (sv ? 'Aktiv' : 'Live')}
                      </button>
                      </Tooltip>
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.name}</p>
                      {rowErrors[c.campaignId] && <p className="text-red-400 text-xs mt-0.5">{rowErrors[c.campaignId]}</p>}
                    </div>

                    {/* Daily budget — inline editable */}
                    <div className="text-right" onClick={e => e.stopPropagation()}>
                      {editingId === c.campaignId ? (
                        <input
                          autoFocus
                          value={budgetDraft}
                          onChange={e => setBudgetDraft(e.target.value)}
                          onBlur={() => saveBudget(c.campaignId, c.budgetId)}
                          onKeyDown={e => { if (e.key === 'Enter') saveBudget(c.campaignId, c.budgetId); if (e.key === 'Escape') setEditingId(null) }}
                          className="w-20 bg-navy-900 border border-mustard/50 text-white text-xs rounded-lg px-2 py-1 text-right focus:outline-none tabular-nums"
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingId(c.campaignId); setBudgetDraft(String(Math.round(budget / 1_000_000))) }}
                          className="text-xs text-slate-400 hover:text-mustard transition-colors tabular-nums"
                          title={sv ? 'Klicka för att ändra dagsbudgeten' : 'Click to change the daily budget'}
                        >
                          {savingBudget[c.campaignId]
                            ? (sv ? 'Sparar…' : 'Saving…')
                            : `${fmtMicros(budget, data.currency)}/${sv ? 'dag' : 'day'}`}
                        </button>
                      )}
                    </div>

                    {/* Spend */}
                    <Tooltip text={sv ? T.spend.sv : T.spend.en}>
                      <div className="text-right cursor-default">
                        <p className="text-sm font-semibold text-white tabular-nums">{fmtMicros(c.spendMicros, data.currency)}</p>
                        <p className="text-xs text-slate-500">{sv ? SPENT_LABEL[spentKey].sv : SPENT_LABEL[spentKey].en}</p>
                      </div>
                    </Tooltip>

                    {/* Customers */}
                    <Tooltip text={c.conversions > 0 ? (sv ? T.customers.sv : T.customers.en) : (sv ? T.noCustomers.sv : T.noCustomers.en)}>
                      <div className="text-right cursor-default">
                        {c.conversions > 0 ? (
                          <>
                            <p className="text-sm font-bold text-green-400 tabular-nums">
                              {c.conversions} {sv ? (c.conversions !== 1 ? 'kunder' : 'kund') : `customer${c.conversions !== 1 ? 's' : ''}`}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">{cpl} {sv ? 'per kund' : 'per customer'}</p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">{sv ? 'Inga kunder ännu' : 'No customers yet'}</p>
                        )}
                      </div>
                    </Tooltip>

                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 text-slate-600 justify-self-end transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Summary expansion — no restated tables, just the highlights + links */}
                  {isOpen && (
                    <div className="px-4 pb-4 bg-navy-900/40">
                      <div className="rounded-xl border border-navy-700 bg-navy-900/60 p-4 space-y-3">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <Tooltip text={sv ? T.clicks.sv : T.clicks.en}>
                            <div className="cursor-default">
                              <p className="text-xs text-slate-500 mb-1">{sv ? 'Klick' : 'Clicks'}</p>
                              <p className="text-base font-bold text-white tabular-nums">{c.clicks.toLocaleString('sv-SE')}</p>
                            </div>
                          </Tooltip>
                          <Tooltip text={sv ? T.impressions.sv : T.impressions.en}>
                            <div className="cursor-default">
                              <p className="text-xs text-slate-500 mb-1">{sv ? 'Visningar' : 'Times shown'}</p>
                              <p className="text-base font-bold text-white tabular-nums">{c.impressions.toLocaleString('sv-SE')}</p>
                            </div>
                          </Tooltip>
                          <Tooltip text={sv ? T.avgCpc.sv : T.avgCpc.en}>
                            <div className="cursor-default">
                              <p className="text-xs text-slate-500 mb-1">{sv ? 'Snittkostnad per klick' : 'Avg cost / click'}</p>
                              <p className="text-base font-bold text-white tabular-nums">{fmtMicros(c.avgCpcMicros, data.currency)}</p>
                            </div>
                          </Tooltip>
                          <Tooltip text={sv ? T.keywords.sv : T.keywords.en}>
                            <div className="cursor-default">
                              <p className="text-xs text-slate-500 mb-1">{sv ? 'Sökord' : 'Keywords'}</p>
                              <p className="text-base font-bold text-white tabular-nums">{campKeywords.length}</p>
                            </div>
                          </Tooltip>
                        </div>

                        {(best || worst) && (
                          <div className="border-t border-navy-700/60 pt-3 space-y-1.5">
                            {best && (
                              <p className="text-xs text-slate-400">
                                <Tooltip text={sv ? T.best.sv : T.best.en}>
                                  <span className="text-green-400 font-medium cursor-default">{sv ? 'Bästa sökord:' : 'Best keyword:'}</span>
                                </Tooltip>{' '}
                                &ldquo;{best.keyword}&rdquo; — {best.conversions} {sv ? (best.conversions !== 1 ? 'kunder' : 'kund') : `customer${best.conversions !== 1 ? 's' : ''}`}
                              </p>
                            )}
                            {worst && (
                              <p className="text-xs text-slate-400">
                                <Tooltip text={sv ? T.worst.sv : T.worst.en}>
                                  <span className="text-red-400 font-medium cursor-default">{sv ? 'Slösar pengar:' : 'Wasting money:'}</span>
                                </Tooltip>{' '}
                                &ldquo;{worst.keyword}&rdquo; — {fmtMicros(worst.spendMicros, data.currency)} {sv ? 'utan kunder' : 'with no customers'}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="border-t border-navy-700/60 pt-3 flex items-center gap-4">
                          <button onClick={() => onGoToTab('keywords')} className="text-xs text-mustard hover:underline">
                            {sv ? 'Se alla sökord →' : 'See all keywords →'}
                          </button>
                          <button onClick={() => onGoToTab('ads')} className="text-xs text-mustard hover:underline">
                            {sv ? 'Se annonserna →' : 'See the ads →'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
