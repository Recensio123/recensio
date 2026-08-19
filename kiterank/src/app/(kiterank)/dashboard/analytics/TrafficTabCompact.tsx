'use client'
import { useMemo } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'
import { useCoverage, coveredValue } from '@/components/DataCoverageProvider'
import { type Period } from '@/components/dashboard/PeriodSelector'
import { type AnalyticsData } from './types'
import { LinksTabTest2 } from './LinksTabTest2'

/*
 * Traffic, in the order the questions actually get asked.
 *
 * Where did they come from, who were they, which sites sent them — and then,
 * at the foot, the tool for tagging a link so the next answer is sharper.
 *
 * The old tab opened with a nine-column channel table: visits, engaged, %
 * bookings, average visit, bookings, change, verdict. Seven numbers per row
 * before a salon owner reached the one that matters, and the last of them was
 * our judgement rather than a measurement. It is a share now — how the visits
 * divide, and how many became bookings.
 *
 * Age and gender are gone from the block. Google draws them from signed-in
 * visitors only and withholds the split entirely when the sample is small,
 * which for a neighbourhood salon is the normal case — so the panel was
 * usually empty, and when it was not it described a fraction of the visitors
 * as though it described all of them. Place and device answer the same
 * question without that footnote.
 */

const WEEK_DIVISOR = 4.3
const YEAR_FACTOR  = 12

const PALETTE = ['#eab308', '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#14b8a6']

const T = {
  sv: {
    fromTitle:   'Varifrån besöken kommer',
    fromSub:     'Marknadsföringskällan bakom varje besök',
    whoTitle:    'Vilka besökarna är',
    where:       'Ort',
    device:      'Enhet',
    sitesTitle:  'Sidor som skickar trafik',
    sitesSub:    'Enskilda sajter och profiler som länkat vidare till dig',
    linksTitle:  'Spårningslänkar',
    visits:      'besök',
    bookings:    'bokningar',
    leads:       'förfrågningar',
    devices:     { Mobile: 'Mobil', Desktop: 'Dator', Tablet: 'Surfplatta' } as Record<string, string>,
    booking:     (n: number) => `${n} bokning${n === 1 ? '' : 'ar'}`,
    fromTip:     'Hur besöken fördelar sig mellan dina marknadsföringskällor. Sökresultat, kartan, sociala medier, annonser och direkta besök.',
    whoTip:      'Var besökarna finns, vad de surfar på och — när Google har underlag — ålder och kön.',
    sitesTip:    'De enskilda sajterna bakom besöken. En källa här är en faktisk webbplats eller profil, till skillnad från kategorierna ovan.',
  },
  en: {
    fromTitle:   'Where the visits come from',
    fromSub:     'The marketing source behind each visit',
    whoTitle:    'Who your visitors are',
    where:       'Place',
    device:      'Device',
    sitesTitle:  'Sites sending traffic',
    sitesSub:    'The individual sites and profiles that linked people to you',
    linksTitle:  'Tracking links',
    visits:      'visits',
    bookings:    'bookings',
    leads:       'enquiries',
    devices:     { Mobile: 'Mobile', Desktop: 'Desktop', Tablet: 'Tablet' } as Record<string, string>,
    booking:     (n: number) => `${n} booking${n === 1 ? '' : 's'}`,
    fromTip:     'How visits divide between your marketing sources: search results, the map, social, ads and direct visits.',
    whoTip:      'Where your visitors are, what they browse on, and — when Google has the data — age and gender.',
    sitesTip:    'The individual sites behind the visits. A source here is an actual website or profile, unlike the categories above.',
  },
}

/** One labelled bar. Lengths are read accurately; ring charts are not. */
function Bar({ label, value, share, color, suffix }: {
  label:   string
  value:   number
  share:   number
  color:   string
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-xs w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: color, opacity: 0.85 }} />
      </div>
      <span className="text-white text-xs font-semibold tabular-nums w-12 text-right shrink-0">
        {value.toLocaleString('sv-SE')}{suffix}
      </span>
    </div>
  )
}


export function TrafficTabCompact({
  data,
  period,
  defaultUrl,
}: {
  data:       AnalyticsData
  period:     Period
  defaultUrl: string
}) {
  const { lang } = useLang()
  const t = T[lang]
  const coverage = useCoverage('website', period)

  /* Flow counts scale with the period and are then cut back to the days the
     tag has actually been running — the same rule the rest of the page uses. */
  const { channels, sites, geo } = useMemo(() => {
    const f = (v: number) => coveredValue(
      period === 'Weekly' ? Math.round(v / WEEK_DIVISOR) :
      period === 'Yearly' ? Math.round(v * YEAR_FACTOR)  : v,
      coverage,
    )
    return {
      channels: data.traffic_sources.map(s => ({
        channel:     s.channel,
        sessions:    f(s.sessions),
        conversions: f(s.conversions),
      })).sort((a, b) => b.sessions - a.sessions),
      sites: data.incoming_sources.map(s => ({
        source:   s.source,
        category: s.category,
        sessions: f(s.sessions),
      })).sort((a, b) => b.sessions - a.sessions),
      /* Places are visit counts as well; only the shares below — device, age,
         gender — are ratios, and a ratio is the same answer at any period. */
      geo: data.geo_sources.map(g => ({ ...g, sessions: f(g.sessions) })),
    }
  }, [data, period, coverage])

  const maxChannel = Math.max(...channels.map(c => c.sessions), 1)
  const maxSite    = Math.max(...sites.map(s => s.sessions), 1)
  const maxGeo     = Math.max(...geo.map(g => g.sessions), 1)

  return (
    <div className="space-y-8">

      {/* ── Where from, and who ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
          <Tooltip text={t.fromTip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">{t.fromTitle}</p>
          </Tooltip>
          <p className="text-slate-600 text-xs mt-0.5 mb-3">{t.fromSub}</p>
          <div className="space-y-2.5">
            {channels.map((c, i) => (
              <div key={c.channel}>
                <Bar
                  label={c.channel}
                  value={c.sessions}
                  share={(c.sessions / maxChannel) * 100}
                  color={PALETTE[i % PALETTE.length]}
                />
                {c.conversions > 0 && (
                  <p className="text-slate-600 text-xs ml-24 pl-3 mt-0.5">
                    {t.booking(c.conversions)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <Tooltip text={t.whoTip}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 cursor-default">{t.whoTitle}</p>
          </Tooltip>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.where}</p>
              <div className="space-y-2">
                {geo.slice(0, 4).map((g, i) => (
                  <Bar
                    key={g.name}
                    label={`${g.flag ?? '📍'} ${g.name}`}
                    value={g.sessions}
                    share={(g.sessions / maxGeo) * 100}
                    color={PALETTE[i % PALETTE.length]}
                  />
                ))}
              </div>
            </div>

            <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{t.device}</p>
              <div className="space-y-2">
                {[
                  { key: 'Mobile',  pct: data.device_mobile  },
                  { key: 'Desktop', pct: data.device_desktop },
                  { key: 'Tablet',  pct: data.device_tablet  },
                ].map((d, i) => (
                  <Bar
                    key={d.key}
                    label={t.devices[d.key]}
                    value={d.pct}
                    share={d.pct}
                    color={PALETTE[i % PALETTE.length]}
                    suffix="%"
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── The sites themselves ────────────────────────────────────────── */}
      <div>
        <div className="flex items-baseline gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">{t.sitesTitle}</h2>
          <Tooltip text={t.sitesTip}>
            <span className="text-xs text-slate-500 cursor-default">{t.sitesSub}</span>
          </Tooltip>
        </div>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {sites.map((s, i) => (
            /* google.com appears once per channel — organic and paid are different rows */
            <div key={`${s.source}-${s.category}`} className="px-4 py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm truncate">{s.source}</p>
                <p className="text-slate-600 text-xs">{s.category}</p>
              </div>
              <div className="w-28 h-2 bg-navy-700 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(s.sessions / maxSite) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length], opacity: 0.85 }}
                />
              </div>
              <span className="text-white text-sm font-semibold tabular-nums w-14 text-right shrink-0">
                {s.sessions.toLocaleString('sv-SE')}
              </span>
              <span className="text-slate-600 text-xs w-10 shrink-0">{t.visits}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tagging a link, where the sources are ───────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">{t.linksTitle}</h2>
        <LinksTabTest2 defaultUrl={defaultUrl} />
      </div>

    </div>
  )
}
