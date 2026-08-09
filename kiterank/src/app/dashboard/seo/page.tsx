import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const mockNearMiss = [
  { query: 'emergency plumber stockholm', position: 7,  clicks: 12, impressions: 880 },
  { query: 'plumber kista',               position: 9,  clicks: 4,  impressions: 320 },
  { query: 'burst pipe repair stockholm', position: 6,  clicks: 8,  impressions: 210 },
]
const mockNotRanking = [
  { query: 'boiler installation stockholm', impressions: 1200, position: 34 },
  { query: 'bathroom renovation plumber',   impressions: 590,  position: 28 },
]
const mockLowCTR = [
  { query: 'plumber stockholm', clicks: 18, impressions: 860, ctr: 0.021, position: 2.4 },
]

function clickPotential(position: number, impressions: number): string {
  // Approximate CTR at position 1 = 28%, current position uses decay formula
  const currentCTR = 0.28 * Math.pow(0.75, position - 1)
  const ratio = Math.round(0.28 / Math.max(currentCTR, 0.01))
  return `~${ratio}x more clicks`
}

export default async function SEOPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id').eq('user_id', user.id).single()
    : { data: null }

  const { data: scQueries } = company
    ? await admin
        .from('search_console_queries')
        .select('*')
        .eq('company_id', company.id)
        .order('impressions', { ascending: false })
    : { data: null }

  const isLive = !!scQueries?.length

  // Derive insight groups from real data
  const nearMiss  = isLive
    ? scQueries!.filter(q => q.position >= 4 && q.position <= 10).slice(0, 10)
    : mockNearMiss

  const notRanking = isLive
    ? scQueries!.filter(q => q.impressions > 50 && q.position > 20).slice(0, 5)
    : mockNotRanking

  const avgCTR = isLive && scQueries!.length > 0
    ? scQueries!.reduce((s, q) => s + q.ctr, 0) / scQueries!.length
    : 0

  const lowCTR = isLive
    ? scQueries!.filter(q => q.position <= 10 && q.impressions > 30 && q.ctr < avgCTR * 0.5).slice(0, 5)
    : mockLowCTR

  const totalRanking   = isLive ? scQueries!.filter(q => q.position <= 100).length : 12
  const nearMissCount  = nearMiss.length

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">SEO</h1>
          <p className="text-slate-400 text-sm mt-1">Organic search opportunities from your Search Console data</p>
        </div>
        {!isLive && (
          <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
            Sample data — connect Search Console
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Keywords ranking',   value: totalRanking },
          { label: 'Near-miss (pos 4–10)', value: nearMissCount },
          { label: 'Low CTR opportunities', value: lowCTR.length },
        ].map(m => (
          <div key={m.label} className="bg-navy-800 rounded-xl p-4 border border-navy-700">
            <p className="text-slate-400 text-xs mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Near-miss keywords */}
      {nearMiss.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-3">
            Quick wins — almost on page 1
          </h2>
          <div className="space-y-2">
            {nearMiss.map((k, i) => (
              <div key={i} className="bg-navy-800 rounded-xl p-4 border border-navy-700 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm font-medium">{k.query}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{k.impressions} impressions/month</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-semibold">#{Math.round(k.position)}</p>
                  <p className="text-green-400 text-xs">{clickPotential(k.position, k.impressions)} if #1</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not ranking / missing pages */}
      {notRanking.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-mustard uppercase tracking-wider mb-3">
            Weak rankings — you&apos;re barely visible for these
          </h2>
          <div className="space-y-2">
            {notRanking.map((p, i) => (
              <div key={i} className="bg-navy-800 rounded-xl p-4 border border-navy-700 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm font-medium">{p.query}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{p.impressions} impressions — avg position #{Math.round(p.position)}</p>
                </div>
                <p className="text-mustard text-xs shrink-0">Create a dedicated page</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low CTR */}
      {lowCTR.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Fix your titles — people see you but don&apos;t click
          </h2>
          <div className="space-y-3">
            {lowCTR.map((item, i) => (
              <div key={i} className="bg-navy-800 rounded-xl p-4 border border-navy-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-medium">{item.query}</span>
                  <span className="text-xs text-red-400">
                    CTR {(item.ctr * 100).toFixed(1)}% vs {(avgCTR * 100).toFixed(1)}% avg
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-x-4">
                  <span>{item.impressions} impressions</span>
                  <span>{item.clicks} clicks</span>
                  <span>avg pos #{Math.round(item.position)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isLive && nearMiss.length === 0 && notRanking.length === 0 && lowCTR.length === 0 && (
        <div className="bg-navy-800 rounded-xl p-8 border border-navy-700 text-center">
          <p className="text-slate-400 text-sm">No keyword data yet — try syncing Search Console data.</p>
        </div>
      )}
    </div>
  )
}
