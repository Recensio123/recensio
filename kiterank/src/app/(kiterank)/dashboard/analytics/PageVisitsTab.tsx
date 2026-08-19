'use client'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { type AnalyticsData, type PageData, type Period } from './types'

/*
 * What happens on each page — and nothing about where it ranks.
 *
 * The old version of this tab answered the same question as Synlighet på
 * Google, one page at a time: position, impressions, click rate, plus four
 * panels built on top of them — pages near page one, pages losing clicks to a
 * weak title, rank movers, content decay. Every one of those rested on a
 * click-rate curve written into our own code, and every one duplicated a page
 * the customer had already read.
 *
 * The question left over is the one nothing else answers: of the pages we
 * publish, which are people actually reading, and for how long. That is GA4's
 * own data and needs no interpretation.
 *
 * Articles come first because they are the only page type that multiplies. The
 * treatment pages are fixed by the price list; about and contact are one each.
 * Everything the customer chooses to do here, week after week, is an article —
 * so the list opens where their decisions are.
 *
 * Visits follow the period selector like every other count on the page. The two
 * ratios do not: the share who stayed and the average time on the page are the
 * same answer whichever window is chosen, so scaling them would be wrong.
 */

/* The mock is monthly at the source — weekly ≈ / 4.3, yearly ≈ × 12. */
const SCALE: Record<Period, number> = { Weekly: 1 / 4.3, Monthly: 1, Yearly: 12 }

const T = {
  sv: {
    articles:    'Artiklar',
    articlesSub: 'De sidor du lägger till över tid — och de enda du väljer själv',
    others:      'Övriga sidor',
    othersSub:   'Startsidan, behandlingarna och de fasta sidorna',
    colPage:     'Sida',
    colVisits:   'Besök',
    colTrend:    '6 månader',
    colStay:     'Stannade kvar',
    colTime:     'Snittid',
    visitsTip:   'Antal besök på sidan under perioden, från Google Analytics.',
    trendTip:    'Besöken per månad de senaste sex månaderna, och förändringen mot den första månaden.',
    stayTip:     'Andelen besökare som stannade kvar och gjorde något på sidan i stället för att lämna direkt.',
    timeTip:     'Hur länge en besökare i snitt var kvar på sidan.',
    empty:       'Inga artiklar publicerade ännu.',
    since:       'mot för sex månader sedan',
  },
  en: {
    articles:    'Articles',
    articlesSub: 'The pages you add over time — and the only ones you choose',
    others:      'Other pages',
    othersSub:   'The start page, the treatments and the fixed pages',
    colPage:     'Page',
    colVisits:   'Visits',
    colTrend:    '6 months',
    colStay:     'Stayed',
    colTime:     'Avg. time',
    visitsTip:   'Visits to this page during the period, from Google Analytics.',
    trendTip:    'Visits per month over the last six months, and the change against the first of them.',
    stayTip:     'The share of visitors who stayed and did something on the page rather than leaving straight away.',
    timeTip:     'How long a visitor stayed on the page on average.',
    empty:       'No articles published yet.',
    since:       'vs six months ago',
  },
}

/*
 * The page's own name.
 *
 * A URL is ASCII by necessity, so a name read out of one loses every å, ä and
 * ö: an article the customer called "Så håller färgen" comes back as
 * "sa-haller-fargen". The real titles come from the site itself. The derived
 * name is only the fallback, for the start page and for paths the site does
 * not recognise.
 */
function pageName(path: string, titles?: Record<string, string>): string {
  const known = titles?.[path.replace(/\/$/, '')]
  if (known) return known
  const last = path.replace(/\/$/, '').split('/').pop() ?? ''
  if (!last) return 'Startsidan'
  return last.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? `${m}m ${s}s` : `${s}s`
}

/** Change against the first month we hold — plain arithmetic on GA4's own
 *  figures, no threshold and no verdict. */
function sixMonthChange(trend: number[]): number | null {
  if (trend.length < 2 || !trend[0]) return null
  return Math.round(((trend[trend.length - 1] - trend[0]) / trend[0]) * 100)
}

function Sparkline({ trend }: { trend: number[] }) {
  if (trend.length < 2) return null
  const max = Math.max(...trend, 1)
  return (
    <div className="flex items-end gap-0.5 h-6">
      {trend.map((v, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm ${i === trend.length - 1 ? 'bg-mustard' : 'bg-navy-600'}`}
          style={{ height: `${Math.max(2, Math.round((v / max) * 24))}px` }}
        />
      ))}
    </div>
  )
}

function PageTable({ pages, titles }: { pages: PageData[]; titles?: Record<string, string> }) {
  const { lang } = useLang()
  const t = T[lang]
  const cols = 'grid-cols-[1fr_72px_112px_92px_76px]'

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className={`grid ${cols} gap-3 px-4 py-2.5 border-b border-navy-700 text-xs text-slate-500 font-medium`}>
            <span>{t.colPage}</span>
            <Tooltip text={t.visitsTip}><span className="text-right cursor-default block">{t.colVisits}</span></Tooltip>
            <Tooltip text={t.trendTip}><span className="text-right cursor-default block">{t.colTrend}</span></Tooltip>
            <Tooltip text={t.stayTip}><span className="text-right cursor-default block">{t.colStay}</span></Tooltip>
            <Tooltip text={t.timeTip}><span className="text-right cursor-default block">{t.colTime}</span></Tooltip>
          </div>

          <div className="divide-y divide-navy-700">
            {pages.map(p => {
              const change = sixMonthChange(p.trend)
              return (
                <div key={p.path} className={`grid ${cols} gap-3 px-4 py-3 items-center`}>
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">{pageName(p.path, titles)}</p>
                    <p className="text-slate-600 text-xs truncate font-mono">{p.path}</p>
                  </div>

                  <span className="text-slate-200 text-sm text-right tabular-nums">
                    {p.sessions.toLocaleString('sv-SE')}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <Sparkline trend={p.trend} />
                    {change !== null && (
                      <Tooltip text={`${change > 0 ? '+' : ''}${change}% ${t.since}`}>
                        <span className={`text-xs tabular-nums cursor-default ${
                          change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          {change > 0 ? '+' : ''}{change}%
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  <span className="text-slate-300 text-xs text-right tabular-nums">
                    {Math.round(p.engagementRate * 100)}%
                  </span>
                  <span className="text-slate-300 text-xs text-right tabular-nums">
                    {fmtTime(p.avgDuration)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PageVisitsTab({ data, titles, period }: {
  data:    AnalyticsData
  titles?: Record<string, string>
  period:  Period
}) {
  const { lang } = useLang()
  const t = T[lang]

  const f = SCALE[period]
  const scaled = data.pages.map(p => ({
    ...p,
    sessions: Math.round(p.sessions * f),
    trend:    p.trend.map(v => Math.round(v * f)),
  }))
  const byVisits = scaled.sort((a, b) => b.sessions - a.sessions)
  const articles = byVisits.filter(p => p.path.startsWith('/artiklar/'))
  const others   = byVisits.filter(p => !p.path.startsWith('/artiklar/'))

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">{t.articles}</h2>
          <span className="text-xs text-slate-500">{t.articlesSub}</span>
        </div>
        {articles.length ? <PageTable pages={articles} titles={titles} /> : <p className="text-slate-500 text-sm">{t.empty}</p>}
      </div>

      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">{t.others}</h2>
          <span className="text-xs text-slate-500">{t.othersSub}</span>
        </div>
        <PageTable pages={others} titles={titles} />
      </div>
    </div>
  )
}
