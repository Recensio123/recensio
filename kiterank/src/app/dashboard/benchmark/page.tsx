import { mockBenchmarks } from '@/lib/mock-data'
import { ScoreCard } from '@/components/dashboard/ScoreCard'

const pillars = [
  { key: 'reputation_score',  label: 'Reputation',  benchmark: 80, description: 'Star rating, review count and response rate' },
  { key: 'visibility_score',  label: 'Visibility',  benchmark: 85, description: 'How often you appear in local search and Maps' },
  { key: 'engagement_score',  label: 'Engagement',  benchmark: 75, description: 'Direction requests, calls and website clicks' },
  { key: 'content_score',     label: 'Content',     benchmark: 80, description: 'Post frequency, photo count and profile completeness' },
  { key: 'conversion_score',  label: 'Conversion',  benchmark: 78, description: 'How many searchers take action on your profile' },
]

export default function BenchmarkPage() {
  const bench = mockBenchmarks

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Benchmark</h1>
        <p className="text-slate-400 text-sm mt-1">How you compare to top performers in your category</p>
      </div>

      <div className="bg-navy-800 rounded-2xl p-6 border border-navy-700 flex items-center gap-8">
        <div>
          <p className="text-slate-400 text-sm mb-1">Overall score</p>
          <div className="flex items-end gap-2">
            <span className="text-6xl font-bold text-white">{bench.overall_score}</span>
            <span className="text-slate-500 mb-2">/ 100</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>You</span>
            <span>Top performers ({bench.top_performer_avg})</span>
          </div>
          <div className="h-3 bg-navy-700 rounded-full overflow-hidden relative">
            <div className="h-full bg-mustard rounded-full" style={{ width: `${bench.overall_score}%` }} />
            <div className="absolute top-0 h-full w-0.5 bg-white/20" style={{ left: `${bench.top_performer_avg}%` }} />
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {bench.top_performer_avg - bench.overall_score} points behind top performers
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Pillar breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pillars.map(p => (
            <div key={p.key} className="space-y-1">
              <ScoreCard label={p.label} score={bench[p.key as keyof typeof bench] as number} benchmark={p.benchmark} />
              <p className="text-xs text-slate-600 px-1">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
