import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken }     from '@/lib/google'

const ADS_BASE = 'https://googleads.googleapis.com/v19'

function adsHeaders(token: string) {
  return {
    Authorization:     `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type':    'application/json',
  }
}

// PATCH /api/ads/update-campaign
// Handles three actions:
//   { action: 'status',        campaignId: string, status: 'ENABLED' | 'PAUSED' }
//   { action: 'budget',        budgetId: string, dailyBudgetMicros: number }
//   { action: 'pause-keyword', keyword: string, matchType: string }
export async function PATCH(req: NextRequest) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin   = c.admin
  const company = { id: c.id }
const { data: conn } = await admin
    .from('google_connections').select('ads_customer_id').eq('company_id', company.id).single()
  if (!conn?.ads_customer_id)
    return NextResponse.json({ error: 'No Google Ads account connected' }, { status: 400 })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  const customerId = conn.ads_customer_id.replace(/-/g, '')
  const body = await req.json()

  try {
    // ── Pause / enable a campaign ─────────────────────────────────────────────
    if (body.action === 'status') {
      const { campaignId, status } = body as { action: 'status'; campaignId: string; status: 'ENABLED' | 'PAUSED' }
      const res = await fetch(`${ADS_BASE}/customers/${customerId}/campaigns:mutate`, {
        method:  'POST',
        headers: adsHeaders(token),
        body:    JSON.stringify({
          operations: [{
            update:     { resourceName: `customers/${customerId}/campaigns/${campaignId}`, status },
            updateMask: 'status',
          }],
        }),
      })
      if (!res.ok) throw new Error(`Campaign status (${res.status}): ${await res.text()}`)
      return NextResponse.json({ ok: true })
    }

    // ── Update daily budget ────────────────────────────────────────────────────
    if (body.action === 'budget') {
      const { budgetId, dailyBudgetMicros } = body as { action: 'budget'; budgetId: string; dailyBudgetMicros: number }
      const res = await fetch(`${ADS_BASE}/customers/${customerId}/campaignBudgets:mutate`, {
        method:  'POST',
        headers: adsHeaders(token),
        body:    JSON.stringify({
          operations: [{
            update: {
              resourceName: `customers/${customerId}/campaignBudgets/${budgetId}`,
              amountMicros: String(Math.round(dailyBudgetMicros)),
            },
            updateMask: 'amountMicros',
          }],
        }),
      })
      if (!res.ok) throw new Error(`Budget update (${res.status}): ${await res.text()}`)
      return NextResponse.json({ ok: true })
    }

    // ── Pause a keyword ────────────────────────────────────────────────────────
    if (body.action === 'pause-keyword') {
      const { keyword, matchType } = body as { action: 'pause-keyword'; keyword: string; matchType: string }

      // Find the criterion resource name via GAQL
      const searchRes = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:search`, {
        method:  'POST',
        headers: adsHeaders(token),
        body:    JSON.stringify({
          query: `
            SELECT ad_group_criterion.resource_name
            FROM ad_group_criterion
            WHERE ad_group_criterion.keyword.text = '${keyword.replace(/'/g, "\\'")}'
              AND ad_group_criterion.keyword.match_type = '${matchType.toUpperCase()}'
              AND ad_group_criterion.status = 'ENABLED'
              AND ad_group_criterion.negative = FALSE
            LIMIT 20
          `,
        }),
      })
      if (!searchRes.ok) throw new Error(`Keyword lookup (${searchRes.status}): ${await searchRes.text()}`)
      const { results = [] } = await searchRes.json()
      if (results.length === 0) throw new Error('Keyword not found in account')

      const ops = results.map((r: { adGroupCriterion: { resourceName: string } }) => ({
        update:     { resourceName: r.adGroupCriterion.resourceName, status: 'PAUSED' },
        updateMask: 'status',
      }))

      const mutateRes = await fetch(`${ADS_BASE}/customers/${customerId}/adGroupCriteria:mutate`, {
        method:  'POST',
        headers: adsHeaders(token),
        body:    JSON.stringify({ operations: ops }),
      })
      if (!mutateRes.ok) throw new Error(`Pause keyword (${mutateRes.status}): ${await mutateRes.text()}`)
      return NextResponse.json({ ok: true, paused: results.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[update-campaign]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    )
  }
}
