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

// POST /api/ads/add-negative
// Body: { text: string, matchType?: 'BROAD' | 'PHRASE' | 'EXACT' }
// Adds as a campaign-level negative keyword to all enabled search campaigns
export async function POST(req: NextRequest) {
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
  const { text, matchType = 'BROAD' } = (await req.json()) as { text: string; matchType?: string }

  if (!text?.trim()) return NextResponse.json({ error: 'Keyword text required' }, { status: 400 })

  try {
    // 1. Fetch all enabled search campaigns
    const searchRes = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:search`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({
        query: `
          SELECT campaign.resource_name
          FROM campaign
          WHERE campaign.status = 'ENABLED'
            AND campaign.advertising_channel_type = 'SEARCH'
        `,
      }),
    })
    if (!searchRes.ok) throw new Error(`Fetch campaigns (${searchRes.status}): ${await searchRes.text()}`)
    const { results = [] } = await searchRes.json()
    const campaignResourceNames: string[] = results.map(
      (r: { campaign: { resourceName: string } }) => r.campaign.resourceName
    )

    if (campaignResourceNames.length === 0) {
      return NextResponse.json({ error: 'No enabled search campaigns found' }, { status: 404 })
    }

    // 2. Add negative keyword to all campaigns in one mutate call
    const ops = campaignResourceNames.map(campaign => ({
      create: {
        campaign,
        negative: true,
        keyword:  {
          text:      text.trim(),
          matchType: matchType.toUpperCase(),
        },
      },
    }))

    const mutateRes = await fetch(`${ADS_BASE}/customers/${customerId}/campaignCriteria:mutate`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({ operations: ops }),
    })
    if (!mutateRes.ok) throw new Error(`Add negative (${mutateRes.status}): ${await mutateRes.text()}`)

    return NextResponse.json({ ok: true, addedTo: campaignResourceNames.length })
  } catch (err) {
    console.error('[add-negative]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add negative keyword' },
      { status: 500 },
    )
  }
}
