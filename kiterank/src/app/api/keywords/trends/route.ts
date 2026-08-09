import { NextResponse } from 'next/server'
// @ts-ignore — no types for this package
import googleTrends from 'google-trends-api'

export async function POST(request: Request) {
  const { keywords, geo } = await request.json()

  try {
    // Get interest over time for the last 5 years
    const interestData = await googleTrends.interestOverTime({
      keyword: keywords.slice(0, 5),
      geo: geo || 'SE',
      startTime: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
    })

    // Get rising related queries for the primary keyword
    const relatedData = await googleTrends.relatedQueries({
      keyword: keywords[0],
      geo: geo || 'SE',
      startTime: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000),
    })

    const interest = JSON.parse(interestData)
    const related = JSON.parse(relatedData)

    const timelineData = interest.default?.timelineData ?? []

    // Build per-keyword trend summary
    const trends = keywords.slice(0, 5).map((kw: string, i: number) => {
      const values = timelineData.map((point: { value: number[] }) => point.value[i] ?? 0)
      const recent = values.slice(-12)
      const older = values.slice(-24, -12)
      const recentAvg = recent.reduce((a: number, b: number) => a + b, 0) / (recent.length || 1)
      const olderAvg = older.reduce((a: number, b: number) => a + b, 0) / (older.length || 1)
      const trend = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100) : 0

      // Find peak month across all years
      const monthlyAvg: number[] = Array(12).fill(0)
      const monthlyCount: number[] = Array(12).fill(0)
      timelineData.forEach((point: { formattedTime: string; value: number[] }) => {
        const month = new Date(point.formattedTime).getMonth()
        monthlyAvg[month] += point.value[i] ?? 0
        monthlyCount[month]++
      })
      const avgByMonth = monthlyAvg.map((v, j) => v / (monthlyCount[j] || 1))
      const peakMonth = avgByMonth.indexOf(Math.max(...avgByMonth))

      return {
        keyword: kw,
        trend,
        peakMonth,
        currentInterest: Math.round(recentAvg),
        rising: trend > 15,
        declining: trend < -15,
      }
    })

    // Rising queries from related
    const risingQueries =
      related.default?.rankedList?.[1]?.rankedKeyword
        ?.slice(0, 6)
        .map((item: { query: string; value: number }) => ({
          query: item.query,
          growth: item.value,
        })) ?? []

    return NextResponse.json({ trends, risingQueries })
  } catch {
    return NextResponse.json({ error: 'Trends fetch failed' }, { status: 500 })
  }
}
