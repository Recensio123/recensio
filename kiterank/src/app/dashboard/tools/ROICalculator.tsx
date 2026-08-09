'use client'
import { useState, useMemo } from 'react'

type Currency = 'SEK' | 'EUR' | 'GBP' | 'USD' | 'NOK' | 'DKK'

const CURRENCIES: Currency[] = ['SEK', 'EUR', 'GBP', 'USD', 'NOK', 'DKK']

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.round(n).toLocaleString('sv-SE')}`
}

export function ROICalculator() {
  const [currency, setCurrency] = useState<Currency>('SEK')
  const [jobValue, setJobValue] = useState(4500)
  const [margin,   setMargin]   = useState(55)
  const [budget,   setBudget]   = useState(5000)
  const [cpcInput, setCpcInput] = useState('')

  const cpc          = cpcInput ? parseFloat(cpcInput) : null
  const breakEvenCPL = jobValue * (margin / 100)
  const breakEvenLeads = budget > 0 && breakEvenCPL > 0 ? budget / breakEvenCPL : 0
  const minConvRate    = cpc && cpc > 0 && breakEvenCPL > 0 ? (cpc / breakEvenCPL) * 100 : null

  const scenarios = useMemo(() => {
    if (breakEvenCPL <= 0 || budget <= 0) return []
    return [
      { label: 'Break-even', sub: '1:1 return', mult: 1 },
      { label: 'Target',     sub: '2:1 return', mult: 2 },
      { label: 'Growth',     sub: '4:1 return', mult: 4 },
    ].map(s => {
      const cplTarget = breakEvenCPL / s.mult
      const leads     = budget / cplTarget
      const profit    = (leads * jobValue * (margin / 100)) - budget
      return { ...s, cplTarget, leads, profit }
    })
  }, [breakEvenCPL, budget, jobValue, margin])

  const isValid = jobValue > 0 && margin > 0 && budget > 0

  const convRateColor =
    minConvRate === null  ? '' :
    minConvRate > 5       ? 'text-red-400' :
    minConvRate > 2       ? 'text-mustard' :
    'text-green-400'

  const convRateBorder =
    minConvRate === null  ? 'border-navy-700' :
    minConvRate > 5       ? 'border-red-500/25' :
    minConvRate > 2       ? 'border-mustard/25' :
    'border-green-500/25'

  const convRateNote =
    minConvRate === null  ? '' :
    minConvRate > 5       ? 'High bar — requires a very strong landing page and tightly-matched keywords.' :
    minConvRate > 2       ? 'Achievable with a well-optimised campaign and relevant ad targeting.' :
    'Very achievable — a properly targeted campaign should comfortably exceed this.'

  return (
    <div className="bg-navy-800 rounded-2xl border border-navy-700 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-base">Ad Spend ROI Calculator</h2>
          <p className="text-slate-500 text-xs mt-1">
            Enter your numbers to find your break-even cost per lead and whether your budget is set up to be profitable.
          </p>
        </div>
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value as Currency)}
          className="shrink-0 bg-navy-900 border border-navy-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-mustard/50"
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Inputs ──────────────────────────────── */}
        <div className="space-y-5">

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Average revenue per job</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs select-none">{currency}</span>
              <input
                type="number" min={0}
                value={jobValue}
                onChange={e => setJobValue(Math.max(0, Number(e.target.value)))}
                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-xl pl-12 pr-4 py-2.5 focus:outline-none tabular-nums"
              />
            </div>
            <p className="text-slate-600 text-xs">Typical invoice value per job — not annual turnover.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">Gross margin</label>
              <span className="text-white font-semibold text-sm tabular-nums">{margin}%</span>
            </div>
            <input
              type="range" min={10} max={90} step={5}
              value={margin}
              onChange={e => setMargin(Number(e.target.value))}
              className="w-full accent-mustard cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>10%</span>
              <span className="text-xs text-slate-500">
                {margin < 30 ? 'Low — material or product-heavy' :
                 margin < 50 ? 'Moderate — typical trades' :
                 margin < 70 ? 'Healthy — skilled services' :
                               'High — professional or consulting'}
              </span>
              <span>90%</span>
            </div>
            <p className="text-slate-600 text-xs">Revenue minus direct costs (labour, materials). Overhead is not included.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Monthly ad budget</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs select-none">{currency}</span>
              <input
                type="number" min={0}
                value={budget}
                onChange={e => setBudget(Math.max(0, Number(e.target.value)))}
                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-xl pl-12 pr-4 py-2.5 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Average cost per click{' '}
              <span className="text-slate-600 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs select-none">{currency}</span>
              <input
                type="number" min={0}
                value={cpcInput}
                onChange={e => setCpcInput(e.target.value)}
                placeholder="e.g. 12"
                className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white placeholder-slate-600 text-sm rounded-xl pl-12 pr-4 py-2.5 focus:outline-none tabular-nums"
              />
            </div>
            <p className="text-slate-600 text-xs">
              Find this in the Google Ads tab. Unlocks the conversion rate requirement below.
            </p>
          </div>

        </div>

        {/* ── Results ─────────────────────────────── */}
        {isValid ? (
          <div className="space-y-3">

            <div className="bg-navy-900 rounded-xl border border-navy-700 px-4 py-4">
              <p className="text-slate-500 text-xs">Break-even cost per lead</p>
              <p className="text-white text-3xl font-bold tabular-nums mt-1 leading-none">
                {fmt(breakEvenCPL, currency)}
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Every lead that costs less than this generates profit. Every lead above it costs you money.
              </p>
            </div>

            <div className="bg-navy-900 rounded-xl border border-navy-700 px-4 py-4">
              <p className="text-slate-500 text-xs">Leads needed to break even</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-white text-3xl font-bold tabular-nums leading-none">
                  {breakEvenLeads.toFixed(1)}
                </p>
                <span className="text-slate-500 text-sm mb-0.5">per month</span>
              </div>
              <p className="text-slate-600 text-xs mt-2">
                Minimum jobs from ads to recover the budget. Every lead beyond this is pure margin.
              </p>
            </div>

            {minConvRate !== null && (
              <div className={`bg-navy-900 rounded-xl border px-4 py-4 ${convRateBorder}`}>
                <p className="text-slate-500 text-xs">Minimum click-to-lead conversion rate</p>
                <p className={`text-3xl font-bold tabular-nums mt-1 leading-none ${convRateColor}`}>
                  {minConvRate.toFixed(2)}%
                </p>
                <p className="text-slate-600 text-xs mt-2">{convRateNote}</p>
              </div>
            )}

          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-navy-700/50 border-dashed">
            <p className="text-slate-600 text-sm text-center px-6">Fill in your numbers on the left to see the results.</p>
          </div>
        )}

      </div>

      {/* ── Scenarios ─────────────────────────────────────────────────────── */}
      {isValid && scenarios.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-navy-700">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Performance scenarios</p>
          <div className="grid grid-cols-3 gap-3">
            {scenarios.map(s => {
              const isBreakEven = s.mult === 1
              const isTarget    = s.mult === 2
              const textColor   = isBreakEven ? 'text-slate-300' : isTarget ? 'text-mustard' : 'text-green-400'
              const borderColor = isBreakEven ? 'border-navy-600' : isTarget ? 'border-mustard/25' : 'border-green-500/25'
              const bgColor     = isBreakEven ? 'bg-navy-900'     : isTarget ? 'bg-mustard/5'     : 'bg-green-500/5'
              return (
                <div key={s.label} className={`rounded-xl border px-4 py-4 ${bgColor} ${borderColor}`}>
                  <p className={`text-xs font-semibold ${textColor}`}>{s.label}</p>
                  <p className="text-slate-600 text-[10px] mb-3">{s.sub}</p>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-slate-600 text-[10px] mb-0.5">CPL target</p>
                      <p className={`text-sm font-bold tabular-nums ${textColor}`}>{fmt(s.cplTarget, currency)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-[10px] mb-0.5">Leads / month</p>
                      <p className="text-white text-sm font-semibold tabular-nums">{s.leads.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-[10px] mb-0.5">Monthly profit</p>
                      <p className={`text-sm font-bold tabular-nums ${isBreakEven ? 'text-slate-600' : textColor}`}>
                        {isBreakEven ? `${currency} 0` : fmt(s.profit, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-slate-700 text-xs">
            Profit = (leads × job value × margin) − ad spend. Business overheads are not included.
          </p>
        </div>
      )}

    </div>
  )
}
