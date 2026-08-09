'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { type Period, type AnalyticsData } from './types'
import { OverviewTabTest2 } from './OverviewTabTest2'
import { TrafficTabTest2 }  from './TrafficTabTest2'
import { PagesTabTest2 }    from './PagesTabTest2'
import { HealthTabTest2 }   from './HealthTabTest2'
import { UTMTabTest }       from './UTMTabTest'
import { ActionPlanLink }   from '@/components/dashboard/ActionPlanLink'
import { HelpButton }       from '@/components/dashboard/HelpButton'

// 5 tabs — Incoming traffic + Marketing channels merged into Traffic,
// Audience dissolved into Traffic, "UTM links" renamed Tracking links.
type Test2Tab = 'overview' | 'traffic' | 'pages' | 'health' | 'links'

const TAB_LABELS: Record<'sv' | 'en', Record<Test2Tab, string>> = {
  sv: {
    overview: 'Översikt',
    traffic:  'Trafik',
    pages:    'Dina sidor',
    health:   'Hälsa',
    links:    'Spårningslänkar',
  },
  en: {
    overview: 'Overview',
    traffic:  'Traffic',
    pages:    'Your pages',
    health:   'Health',
    links:    'Tracking links',
  },
}

const PERIOD_LABELS: Record<'sv' | 'en', Record<Period, string>> = {
  sv: { Weekly: 'Veckovis', Monthly: 'Månadsvis', Yearly: 'Årsvis' },
  en: { Weekly: 'Weekly',   Monthly: 'Monthly',   Yearly: 'Yearly' },
}

const TAB_IDS: Test2Tab[] = ['overview', 'traffic', 'pages', 'health', 'links']

export function AnalyticsDashboardTest2({ data }: { data: AnalyticsData }) {
  const { lang } = useLang()
  const [tab,    setTab]    = useState<Test2Tab>('overview')
  const [period, setPeriod] = useState<Period>('Monthly')

  const showPeriod  = tab === 'overview' || tab === 'traffic'
  const periodLabel = lang === 'sv'
    ? (period === 'Weekly' ? 'Vecka mot vecka' : period === 'Monthly' ? 'Månad mot månad' : 'År mot år')
    : (period === 'Weekly' ? 'WoW' : period === 'Monthly' ? 'MoM' : 'YoY')

  const linkContext = lang === 'sv'
    ? 'Vill du att fler besökare blir kunder?'
    : 'Want more visitors to become customers?'

  return (
    <div className="space-y-8">

      {/* Tab bar + period toggle */}
      <div className="flex items-end justify-between border-b border-navy-700 flex-wrap gap-2">
        <nav className="flex gap-1 overflow-x-auto">
          {TAB_IDS.map(id => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === id
                  ? 'text-white border-mustard'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {TAB_LABELS[lang][id]}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 mb-2">
          {showPeriod && (
            <div className="flex bg-navy-800 border border-navy-700 rounded-lg p-0.5 gap-0.5">
              {(['Weekly', 'Monthly', 'Yearly'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${
                    period === p ? 'bg-mustard text-navy-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {PERIOD_LABELS[lang][p]}
                </button>
              ))}
            </div>
          )}
          <HelpButton topic="hemsida" section={tab} />
        </div>
      </div>

      {tab === 'overview' && <OverviewTabTest2 data={data} period={period} onGoToTraffic={() => setTab('traffic')} />}
      {tab === 'traffic'  && <TrafficTabTest2 data={data} period={period} periodLabel={periodLabel} />}
      {tab === 'pages'    && <PagesTabTest2 data={data} />}
      {tab === 'health'   && <HealthTabTest2 websiteUrl={data.website_url} />}
      {tab === 'links'    && <UTMTabTest />}

      <ActionPlanLink context={linkContext} />

    </div>
  )
}
