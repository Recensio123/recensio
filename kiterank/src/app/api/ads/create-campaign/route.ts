import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken }     from '@/lib/google'

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignRequest = {
  campaignName:  string
  dailyBudget:   number
  goal:          'leads' | 'calls' | 'traffic'
  targetingType: 'region' | 'postcodes' | 'radius'
  location:      string
  postcodes:     string[]
  radiusCoords:  { lat: number; lng: number } | null
  radiusKm:      number
  keywords:      Array<{ text: string; matchType: string; cpcEuros: number }>
  headlines:     string[]
  descriptions:  string[]
  finalUrl:      string
}

// ─── Google Ads API helpers ───────────────────────────────────────────────────

const ADS_BASE = 'https://googleads.googleapis.com/v19'

function adsHeaders(token: string) {
  return {
    Authorization:     `Bearer ${token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type':    'application/json',
  }
}

async function adsMutate(
  token:      string,
  customerId: string,
  resource:   string,
  operations: unknown[],
) {
  const res = await fetch(`${ADS_BASE}/customers/${customerId}/${resource}:mutate`, {
    method:  'POST',
    headers: adsHeaders(token),
    body:    JSON.stringify({ operations }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ads ${resource} (${res.status}): ${text}`)
  }
  return res.json() as Promise<{ results: Array<{ resourceName: string }> }>
}

// Resolve a location name or postcode → geoTargetConstant resource name.
// Returns null if the name cannot be resolved — callers skip silently.
async function resolveGeoTarget(token: string, name: string): Promise<string | null> {
  try {
    const res = await fetch(`${ADS_BASE}/geoTargetConstants:suggest`, {
      method:  'POST',
      headers: adsHeaders(token),
      body:    JSON.stringify({ locale: 'en', locationNames: { names: [name] } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.geoTargetConstantSuggestions?.[0]?.geoTargetConstant?.resourceName as string) ?? null
  } catch {
    return null
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'No company found' }, { status: 400 })

  const { data: conn } = await admin
    .from('google_connections')
    .select('ads_customer_id')
    .eq('company_id', company.id)
    .single()
  if (!conn?.ads_customer_id)
    return NextResponse.json({ error: 'No Google Ads account connected' }, { status: 400 })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  // Google Ads API requires the ID without dashes
  const customerId = conn.ads_customer_id.replace(/-/g, '')

  // ── Request body ────────────────────────────────────────────────────────────
  const body = (await req.json()) as CampaignRequest
  const {
    campaignName, dailyBudget, goal,
    targetingType, location, postcodes, radiusCoords, radiusKm,
    keywords, headlines, descriptions, finalUrl,
  } = body

  try {
    // ── 1. Budget ──────────────────────────────────────────────────────────────
    const budgetResult = await adsMutate(token, customerId, 'campaignBudgets', [{
      create: {
        name:           `${campaignName} — Budget`,
        amountMicros:   String(Math.round(dailyBudget * 1_000_000)),
        deliveryMethod: 'STANDARD',
      },
    }])
    const budgetResource = budgetResult.results[0].resourceName

    // ── 2. Campaign ────────────────────────────────────────────────────────────
    // Use Maximize Clicks for all goals — safest strategy, requires no
    // conversion tracking setup. The client can upgrade in Google Ads.
    const startDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    const campaignResult = await adsMutate(token, customerId, 'campaigns', [{
      create: {
        name:                    campaignName,
        advertisingChannelType:  'SEARCH',
        status:                  'PAUSED',
        campaignBudget:          budgetResource,
        networkSettings: {
          targetGoogleSearch:   true,
          targetSearchNetwork:  false,
          targetContentNetwork: false,
        },
        maximizeClicks: {},
        startDate,
      },
    }])
    const campaignResource = campaignResult.results[0].resourceName

    // ── 3. Location targeting ──────────────────────────────────────────────────
    if (targetingType === 'radius' && radiusCoords) {
      await adsMutate(token, customerId, 'campaignCriteria', [{
        create: {
          campaign: campaignResource,
          proximity: {
            geoPoint: {
              latitudeInMicroDegrees:  Math.round(radiusCoords.lat * 1_000_000),
              longitudeInMicroDegrees: Math.round(radiusCoords.lng * 1_000_000),
            },
            radius:      radiusKm,
            radiusUnits: 'KILOMETERS',
          },
        },
      }])
    } else if (targetingType === 'postcodes' && postcodes?.length > 0) {
      const locationOps: unknown[] = []
      for (const pc of postcodes) {
        const geo = await resolveGeoTarget(token, pc)
        if (geo) {
          locationOps.push({
            create: {
              campaign: campaignResource,
              location: { geoTargetConstant: geo },
            },
          })
        }
      }
      if (locationOps.length > 0) {
        await adsMutate(token, customerId, 'campaignCriteria', locationOps)
      }
    } else if (location?.trim()) {
      const geo = await resolveGeoTarget(token, location.trim())
      if (geo) {
        await adsMutate(token, customerId, 'campaignCriteria', [{
          create: {
            campaign: campaignResource,
            location: { geoTargetConstant: geo },
          },
        }])
      }
    }

    // ── 4. Ad group ────────────────────────────────────────────────────────────
    const maxCpcMicros = keywords.length
      ? Math.max(...keywords.map(k => k.cpcEuros * 1_000_000))
      : 5_000_000

    const adGroupResult = await adsMutate(token, customerId, 'adGroups', [{
      create: {
        name:          `${campaignName} — Main`,
        campaign:      campaignResource,
        status:        'ENABLED',
        type:          'SEARCH_STANDARD',
        cpcBidMicros:  String(Math.round(maxCpcMicros)),
      },
    }])
    const adGroupResource = adGroupResult.results[0].resourceName

    // ── 5. Keywords ────────────────────────────────────────────────────────────
    if (keywords.length > 0) {
      const kwOps = keywords.map(kw => ({
        create: {
          adGroup:      adGroupResource,
          status:       'ENABLED',
          keyword: {
            text:       kw.text,
            matchType:  kw.matchType.toUpperCase(), // EXACT | PHRASE | BROAD
          },
          cpcBidMicros: String(Math.round(kw.cpcEuros * 1_000_000)),
        },
      }))
      await adsMutate(token, customerId, 'adGroupCriteria', kwOps)
    }

    // ── 6. Responsive search ad ────────────────────────────────────────────────
    const activeHeadlines    = headlines.filter((h: string)    => h.trim())
    const activeDescriptions = descriptions.filter((d: string) => d.trim())

    if (activeHeadlines.length >= 3 && activeDescriptions.length >= 2) {
      await adsMutate(token, customerId, 'adGroupAds', [{
        create: {
          adGroup: adGroupResource,
          status:  'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines:    activeHeadlines.map((text: string)    => ({ text })),
              descriptions: activeDescriptions.map((text: string) => ({ text })),
            },
            finalUrls: [finalUrl],
          },
        },
      }])
    }

    // ── Return ─────────────────────────────────────────────────────────────────
    // Extract numeric ID from resourceName ("customers/123/campaigns/456" → "456")
    const campaignId = campaignResource.split('/').pop() ?? ''

    return NextResponse.json({ success: true, customerId, campaignId })

  } catch (err) {
    console.error('[create-campaign]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Campaign creation failed' },
      { status: 500 },
    )
  }
}
