import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken }     from '@/lib/google'

const ADS_BASE = 'https://googleads.googleapis.com/v19'

function adsHeaders(token: string) {
  return {
    Authorization:     `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type':    'application/json',
  }
}

// POST /api/ads/update-extensions
// Body: { type: 'callout', callouts: string[] }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies').select('id').eq('user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { data: conn } = await admin
    .from('google_connections').select('ads_customer_id').eq('company_id', company.id).single()

  // Mock mode — no real Google Ads account connected
  if (!conn?.ads_customer_id) return NextResponse.json({ ok: true })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  const customerId = conn.ads_customer_id.replace(/-/g, '')
  const body = await req.json() as { type: 'callout'; callouts: string[] }

  if (body.type !== 'callout' || !body.callouts?.length) {
    return NextResponse.json({ error: 'type and callouts are required' }, { status: 400 })
  }

  try {
    // Step 1: Create callout assets
    const assetRes = await fetch(`${ADS_BASE}/customers/${customerId}/assets:mutate`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({
        operations: body.callouts.map(text => ({
          create: { calloutAsset: { calloutText: text } },
        })),
      }),
    })
    if (!assetRes.ok) throw new Error(`Create assets (${assetRes.status}): ${await assetRes.text()}`)
    const assetData = await assetRes.json() as { results: { resourceName: string }[] }
    const assetResourceNames = assetData.results.map(r => r.resourceName)

    // Step 2: Fetch enabled campaigns
    const searchRes = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:search`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({
        query: `SELECT campaign.resource_name FROM campaign WHERE campaign.status = 'ENABLED' LIMIT 50`,
      }),
    })
    if (!searchRes.ok) throw new Error(`Fetch campaigns (${searchRes.status}): ${await searchRes.text()}`)
    const searchData = await searchRes.json() as { results?: { campaign: { resourceName: string } }[] }
    const campaignResourceNames = (searchData.results ?? []).map(r => r.campaign.resourceName)

    if (campaignResourceNames.length === 0) {
      return NextResponse.json({ ok: true, note: 'No enabled campaigns to link to' })
    }

    // Step 3: Link assets to campaigns
    const linkOps = assetResourceNames.flatMap(asset =>
      campaignResourceNames.map(campaign => ({
        create: { asset, campaign, fieldType: 'CALLOUT' },
      }))
    )

    const linkRes = await fetch(`${ADS_BASE}/customers/${customerId}/campaignAssets:mutate`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({ operations: linkOps }),
    })
    if (!linkRes.ok) throw new Error(`Link assets (${linkRes.status}): ${await linkRes.text()}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update-extensions]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    )
  }
}
