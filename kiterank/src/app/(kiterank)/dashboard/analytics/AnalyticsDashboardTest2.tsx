'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { type Period, type AnalyticsData } from './types'
import { type BookingsByPeriod } from './siteBookings'
import { OverviewTabTest2 } from './OverviewTabTest2'
import { TrafficTabTest2 }  from './TrafficTabTest2'
import { PagesTabTest2 }    from './PagesTabTest2'
import { PageVisitsTab }    from './PageVisitsTab'
import { TrafficTabCompact } from './TrafficTabCompact'
import { HealthTabTest2 }   from './HealthTabTest2'
import { LinksTabTest2 }    from './LinksTabTest2'
import { usePlan }          from '@/components/PlanProvider'
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
/* In testbok2 the link builder sits at the foot of Traffic, beside the sources
   it exists to explain, so it no longer needs a tab of its own. */
const TAB_IDS_TESTBOK2: Test2Tab[] = ['overview', 'traffic', 'pages', 'health']

export function AnalyticsDashboardTest2({ data, pageTitles, bookings, periods }: { data: AnalyticsData; pageTitles?: Record<string, string>; bookings?: BookingsByPeriod
  /** One measured snapshot per window on a live account; null on example data. */
  periods?: Record<string, AnalyticsData> | null }) {
  const { lang } = useLang()
  const { plan } = usePlan()
  const [tab,    setTab]    = useState<Test2Tab>('overview')
  const [period, setPeriod] = useState<Period>('Monthly')

  /* Every tab whose figures are counts follows the selector. Health is a scan
     of the site as it stands right now and has no period to speak of. */
  const showPeriod  = tab !== 'health'

  /* On a live account each window is its own snapshot from Google, so the tabs
     read the selected one directly. On example data there is one set and the
     tabs scale it — that scaling is a property of the mock, not of the page. */
  const view = periods?.[period] ?? data
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
          {(plan === 'testbok2' ? TAB_IDS_TESTBOK2 : TAB_IDS).map(id => (
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

      {tab === 'overview' && <OverviewTabTest2 data={view} period={period} bookings={plan === 'testbok2' ? bookings : null} />}
      {tab === 'traffic'  && (plan === 'testbok2'
        ? <TrafficTabCompact data={view} period={period} defaultUrl={data.website_url} />
        : <TrafficTabTest2   data={view} period={period} periodLabel={periodLabel} />)}
      {/* testbok2 answers what happens on each page; the ranking columns the
          old tab carried live on Synlighet på Google, one page over. */}
      {tab === 'pages'    && (plan === 'testbok2'
        ? <PageVisitsTab  data={view} titles={pageTitles} period={period} />
        : <PagesTabTest2  data={view} />)}
      {tab === 'health'   && <HealthTabTest2 websiteUrl={data.website_url} />}
      {tab === 'links'    && <LinksTabTest2 defaultUrl={data.website_url} />}

      <ActionPlanLink context={linkContext} />

    </div>
  )
}
