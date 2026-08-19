'use client'
import { useState } from 'react'
import { OverviewTabTest2 }  from './OverviewTabTest2'
import { ReviewsTabTest2 }   from './ReviewsTabTest2'
import { ContentTabTest2 }   from './ContentTabTest2'
import { ChecklistTabTest2 } from './ChecklistTabTest2'
import { CompetitorsTabTest2 } from './CompetitorsTabTest2'
import { type GBPData }      from './types'
import { PeriodSelector, type Period, PERIOD_LABEL } from '@/components/dashboard/PeriodSelector'
import { ActionPlanLink }    from '@/components/dashboard/ActionPlanLink'
import { HelpButton }        from '@/components/dashboard/HelpButton'
import { useLang } from '@/components/LanguageProvider'

/*
 * Four tabs, two side views.
 *
 * Overview, reviews, posts and photos are the work — the things a salon
 * comes back to week after week. Setup and the competitor comparison are
 * reached from the overview instead of standing in the menu: the first is
 * finished once and then irrelevant, the second is worth knowing but is not
 * something you do. Six tabs made a beginner choose before they had anything
 * to choose between.
 */
type Tab = 'overview' | 'reviews' | 'content'
type View = Tab | 'competitors' | 'audit'

const MENU_TABS: Tab[] = ['overview', 'reviews', 'content']

const TAB_LABELS: Record<'sv' | 'en', Record<View, string>> = {
  sv: {
    overview:    'Översikt',
    reviews:     'Recensioner',
    content:     'Bilder & inlägg',
    competitors: 'Salongerna omkring dig',
    audit:       'Profilens uppsättning',
  },
  en: {
    overview:    'Overview',
    reviews:     'Reviews',
    content:     'Photos & posts',
    competitors: 'The salons around you',
    audit:       'Profile setup',
  },
}

const BACK: Record<'sv' | 'en', string> = { sv: 'Tillbaka till översikten', en: 'Back to overview' }

export function GBPDashboardTest2({ data }: { data: GBPData }) {
  const { lang } = useLang()
  const [tab,    setTab]    = useState<View>('overview')
  const [period, setPeriod] = useState<Period>('Monthly')
  const periodLabel = PERIOD_LABEL[period]

  /*
   * Setup only — eight facts filled in once. Posting and collecting reviews
   * used to be counted here too, which meant the "setup" could never finish:
   * a month without a post reopened it. Those two are recurring work and
   * live in the attention list on the overview instead.
   */
  const { auditPassed, auditTotal } = (() => {
    const ownerPhotos = data.mediaItems.filter(m => m.source === 'OWNER').length
    const hasCover    = data.mediaItems.some(m => m.category === 'COVER')
    const checks = [
      data.audit.hasDescription,
      data.audit.hasPhone,
      true,                                 // website link
      data.audit.hasHours,
      hasCover,
      ownerPhotos >= 3,
      (data.services?.length ?? 0) > 0,
      data.audit.hasAttributes,
    ]
    return { auditPassed: checks.filter(Boolean).length, auditTotal: checks.length }
  })()

  const badges: Partial<Record<Tab, number>> = { reviews: data.unansweredReviews }
  const sideView = tab === 'audit' || tab === 'competitors'

  return (
    <>
      {/* A side view replaces the tab row with its own name and a way back,
          so there is never a menu entry that only sometimes belongs there. */}
      {sideView ? (
        <div className="border-b border-navy-700 mb-6 flex items-end justify-between flex-wrap gap-2 pb-3">
          <div>
            <button
              onClick={() => setTab('overview')}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              ← {BACK[lang]}
            </button>
            <h2 className="text-white text-lg font-semibold mt-1">{TAB_LABELS[lang][tab]}</h2>
          </div>
          <HelpButton topic="google-profil" section={tab} />
        </div>
      ) : (
        <div className="border-b border-navy-700 mb-6 flex items-end justify-between flex-wrap gap-2">
          <div className="flex gap-1 flex-wrap">
            {MENU_TABS.map(id => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === id
                    ? 'border-mustard text-mustard'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {TAB_LABELS[lang][id]}
                {(badges[id] ?? 0) > 0 && (
                  <span className="bg-mustard text-navy-950 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {badges[id]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-3">
            {tab === 'overview' && (
              <PeriodSelector period={period} onChange={setPeriod} />
            )}
            <HelpButton topic="google-profil" section={tab} />
          </div>
        </div>
      )}

      {tab === 'overview' && <OverviewTabTest2 data={data} period={period} periodLabel={periodLabel} auditPassed={auditPassed} auditTotal={auditTotal} onTabChange={t => setTab(t as View)} />}
      {tab === 'reviews'  && <ReviewsTabTest2 />}
      {tab === 'content'  && <ContentTabTest2 displayItems={data.mediaItems} />}
      {tab === 'competitors' && <CompetitorsTabTest2 />}
      {tab === 'audit'       && <ChecklistTabTest2 data={data} onTabChange={t => setTab(t as View)} />}

      <ActionPlanLink />
    </>
  )
}
