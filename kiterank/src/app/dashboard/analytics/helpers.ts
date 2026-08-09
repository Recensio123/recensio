export function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s}s`
}

export function fmtSaving(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`
}

// Expected CTR by average rank position — Backlinko / Ahrefs industry benchmarks
export function expectedCTR(position: number): number {
  if (position <= 1)  return 28
  if (position <= 2)  return 15
  if (position <= 3)  return 11
  if (position <= 4)  return 8
  if (position <= 5)  return 6
  if (position <= 6)  return 5
  if (position <= 7)  return 4
  if (position <= 8)  return 3.5
  if (position <= 9)  return 3
  if (position <= 10) return 2.5
  return 1
}
