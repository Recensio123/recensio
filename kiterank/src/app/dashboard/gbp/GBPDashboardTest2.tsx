'use client'
import { useState } from 'react'
import { OverviewTabTest2 }  from './OverviewTabTest2'
import { ReviewsTabTest2 }   from './ReviewsTabTest2'
import { PostsTabTest2 }     from './PostsTabTest2'
import { PhotosTabTest2 }    from './PhotosTabTest2'
import { ChecklistTabTest2 } from './ChecklistTabTest2'
import { CompetitorsTabTest2 } from './CompetitorsTabTest2'
import { type GBPData }      from './types'
import { PeriodSelector, type Period, PERIOD_LABEL } from '@/components/dashboard/PeriodSelector'
import { ActionPlanLink }    from '@/components/dashboard/ActionPlanLink'
import { HelpButton }        from '@/components/dashboard/HelpButton'
import { useLang } from '@/components/LanguageProvider'

type Tab = 'overview' | 'reviews' | 'posts' | 'photos' | 'competitors' | 'audit'

const TAB_LABELS: Record<'sv' | 'en', Record<Tab, string>> = {
  sv: {
    overview:    'Översikt',
    reviews:     'Recensioner',
    posts:       'Inlägg',
    photos:      'Foton',
    competitors: 'Konkurrenter',
    audit:       'Checklista',
  },
  en: {
    overview:    'Overview',
    reviews:     'Reviews',
    posts:       'Posts',
    photos:      'Photos',
    competitors: 'Competitors',
    audit:       'Checklist',
  },
}

export function GBPDashboardTest2({ data }: { data: GBPData }) {
  const { lang } = useLang()
  const [tab,    setTab]    = useState<Tab>('overview')
  const [period, setPeriod] = useState<Period>('Monthly')
  const periodLabel = PERIOD_LABEL[period]

  const { auditPassed, auditTotal } = (() => {
    const ownerPhotos = data.mediaItems.filter(m => m.source === 'OWNER').length
    const hasCover    = data.mediaItems.some(m => m.category === 'COVER')
    const checks = [
      data.audit.hasDescription,
      data.audit.hasPhone,
      true,
      data.audit.hasHours,
      hasCover,
      ownerPhotos >= 3,
      data.daysSincePost <= 30,
      data.totalReviews >= 5,
      (data.services?.length ?? 0) > 0,
      data.audit.hasAttributes,
    ]
    return { auditPassed: checks.filter(Boolean).length, auditTotal: checks.length }
  })()

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: TAB_LABELS[lang].overview },
    { id: 'reviews',  label: TAB_LABELS[lang].reviews, badge: data.unansweredReviews },
    { id: 'posts',    label: TAB_LABELS[lang].posts   },
    { id: 'photos',      label: TAB_LABELS[lang].photos  },
    { id: 'competitors', label: TAB_LABELS[lang].competitors },
    { id: 'audit',       label: TAB_LABELS[lang].audit, badge: auditTotal - auditPassed },
  ]

  return (
    <>
      <div className="border-b border-navy-700 mb-6 flex items-end justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-mustard text-mustard'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="bg-mustard text-navy-950 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {t.badge}
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

      {tab === 'overview' && <OverviewTabTest2 data={data} period={period} periodLabel={periodLabel} auditPassed={auditPassed} auditTotal={auditTotal} onTabChange={t => setTab(t as Tab)} />}
      {tab === 'reviews'  && <ReviewsTabTest2 />}
      {tab === 'posts'    && <PostsTabTest2 />}
      {tab === 'photos'      && <PhotosTabTest2 displayItems={data.mediaItems} />}
      {tab === 'competitors' && <CompetitorsTabTest2 />}
      {tab === 'audit'       && <ChecklistTabTest2 data={data} onTabChange={t => setTab(t as Tab)} />}

      <ActionPlanLink />
    </>
  )
}
