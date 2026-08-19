import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken }     from '@/lib/google'
import { type AdScheduleBlock } from '@/app/(kiterank)/dashboard/paid-search/types'

const ADS_BASE = 'https://googleads.googleapis.com/v19'

function adsHeaders(token: string) {
  return {
    Authorization:     `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type':    'application/json',
  }
}

// POST /api/ads/update-schedule
// Body: { campaignId: string, schedule: AdScheduleBlock[] }
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
  const body = await req.json() as { campaignId: string; schedule: AdScheduleBlock[] }
  const { campaignId, schedule } = body

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  try {
    // Step 1: Find existing ad schedule criteria for this campaign
    const searchRes = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:search`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({
        query: `SELECT campaign_criterion.resource_name FROM campaign_criterion WHERE campaign.id = '${campaignId}' AND campaign_criterion.type = 'AD_SCHEDULE'`,
      }),
    })
    if (!searchRes.ok) throw new Error(`Fetch schedule criteria (${searchRes.status}): ${await searchRes.text()}`)
    const searchData = await searchRes.json() as { results?: { campaignCriterion: { resourceName: string } }[] }
    const existingCriteria = (searchData.results ?? []).map(r => r.campaignCriterion.resourceName)

    // Step 2: Remove existing criteria if any
    if (existingCriteria.length > 0) {
      const removeRes = await fetch(`${ADS_BASE}/customers/${customerId}/campaignCriteria:mutate`, {
        method:  'POST',
        headers: adsHeaders(token),
        body:    JSON.stringify({
          operations: existingCriteria.map(resourceName => ({ remove: resourceName })),
        }),
      })
      if (!removeRes.ok) throw new Error(`Remove criteria (${removeRes.status}): ${await removeRes.text()}`)
    }

    // Step 3: Add new schedule criteria (skip if schedule is empty = 24/7)
    if (schedule.length > 0) {
      const addRes = await fetch(`${ADS_BASE}/customers/${customerId}/campaignCriteria:mutate`, {
        method:  'POST',
        headers: adsHeaders(token),
        body:    JSON.stringify({
          operations: schedule.map(block => ({
            create: {
              campaign:    `customers/${customerId}/campaigns/${campaignId}`,
              type:        'AD_SCHEDULE',
              adSchedule:  {
                dayOfWeek:   block.dayOfWeek,
                startHour:   block.startHour,
                startMinute: 'ZERO',
                endHour:     block.endHour,
                endMinute:   'ZERO',
              },
            },
          })),
        }),
      })
      if (!addRes.ok) throw new Error(`Add schedule (${addRes.status}): ${await addRes.text()}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update-schedule]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    )
  }
}
