type Props = { label: string; score: number; benchmark: number }

export function ScoreCard({ label, score, benchmark }: Props) {
  const color = score >= 70 ? 'bg-green-500' : score >= 45 ? 'bg-mustard' : 'bg-red-500'

  return (
    <div className="bg-navy-800 rounded-xl p-4 border border-navy-700">
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-xl font-bold text-white">{score}</span>
      </div>
      <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-slate-600 mt-2">Top performers: {benchmark}+</p>
    </div>
  )
}
