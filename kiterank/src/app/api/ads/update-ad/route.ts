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

// POST /api/ads/update-ad
// Body: { adId: string, headlines: string[], descriptions: string[] }
// adId is the full adGroupAd resource name: 'customers/{cid}/adGroupAds/{adGroupId}~{adId}'
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
  const body = await req.json() as { adId: string; headlines: string[]; descriptions: string[] }
  const { adId, headlines, descriptions } = body

  if (!adId || !headlines?.length || !descriptions?.length) {
    return NextResponse.json({ error: 'adId, headlines, and descriptions are required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${ADS_BASE}/customers/${customerId}/adGroupAds:mutate`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({
        operations: [{
          update: {
            resourceName: adId,
            ad: {
              resourceName:         adId.replace('/adGroupAds/', '/ads/').replace(/~\d+$/, ''),
              responsiveSearchAd: {
                headlines:    headlines.map(text => ({ text })),
                descriptions: descriptions.map(text => ({ text })),
              },
            },
          },
          updateMask: 'ad.responsiveSearchAd.headlines,ad.responsiveSearchAd.descriptions',
        }],
      }),
    })

    if (!res.ok) throw new Error(`Update ad (${res.status}): ${await res.text()}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update-ad]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    )
  }
}
