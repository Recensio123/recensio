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

/*
 * POST /api/ads/update-extensions
 *
 * Body: { type: 'call',               phone: string }
 *     | { type: 'sitelinks',          sitelinks: { title, description, url }[] }
 *     | { type: 'callout',            callouts: string[] }
 *     | { type: 'structured_snippet', header: string, values: string[] }
 *     | { type: 'location' }
 *
 * Every reply carries `applied`. It is the whole point of this route: the
 * callers are buttons that flip a card to green, and a card that goes green
 * without anything reaching Google is worse than an error. Two things used to
 * cause exactly that. An account with no Ads connection returned `ok: true`
 * and the card lit up. And only callouts were ever implemented — the location
 * and snippet buttons posted a type this route rejected with a 400 they did
 * not read.
 *
 * `applied: false` always comes with a `reason` the UI can turn into a sentence.
 */

type Body =
  | { type: 'call';               phone: string }
  | { type: 'sitelinks';          sitelinks: { title: string; description: string; url: string }[] }
  | { type: 'callout';            callouts: string[] }
  | { type: 'structured_snippet'; header: string; values: string[] }
  | { type: 'location' }

type Reason = 'no_ads_account' | 'no_campaigns' | 'profile_not_linked'

function notApplied(reason: Reason) {
  return NextResponse.json({ ok: true, applied: false, reason })
}

async function enabledCampaigns(token: string, customerId: string): Promise<string[]> {
  const res = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method:  'POST',
    headers: adsHeaders(token),
    body:    JSON.stringify({
      query: `SELECT campaign.resource_name FROM campaign WHERE campaign.status = 'ENABLED' LIMIT 50`,
    }),
  })
  if (!res.ok) throw new Error(`Fetch campaigns (${res.status}): ${await res.text()}`)
  const data = await res.json() as { results?: { campaign: { resourceName: string } }[] }
  return (data.results ?? []).map(r => r.campaign.resourceName)
}

/** Create assets, then attach each to every enabled campaign. */
async function createAndLink(
  token: string,
  customerId: string,
  creates: unknown[],
  fieldType: string,
) {
  const assetRes = await fetch(`${ADS_BASE}/customers/${customerId}/assets:mutate`, {
    method:  'POST',
    headers: adsHeaders(token),
    body:    JSON.stringify({ operations: creates.map(create => ({ create })) }),
  })
  if (!assetRes.ok) throw new Error(`Create assets (${assetRes.status}): ${await assetRes.text()}`)
  const assetData = await assetRes.json() as { results: { resourceName: string }[] }
  const assets    = assetData.results.map(r => r.resourceName)

  const campaigns = await enabledCampaigns(token, customerId)
  if (campaigns.length === 0) return { applied: false as const, reason: 'no_campaigns' as const }

  const operations = assets.flatMap(asset =>
    campaigns.map(campaign => ({ create: { asset, campaign, fieldType } })),
  )

  const linkRes = await fetch(`${ADS_BASE}/customers/${customerId}/campaignAssets:mutate`, {
    method:  'POST',
    headers: adsHeaders(token),
    body:    JSON.stringify({ operations }),
  })
  if (!linkRes.ok) throw new Error(`Link assets (${linkRes.status}): ${await linkRes.text()}`)

  return { applied: true as const }
}

/*
 * The address is not ours to create.
 *
 * A location asset is not written like a callout — the addresses come from the
 * Google Business Profile, and Ads only sees them once the profile account is
 * linked and syncing into a location asset set. That linking happens inside
 * Google Ads, under Linked accounts, and needs someone with access to both.
 *
 * So: if the sync already exists we attach it to the campaigns. If it does not,
 * we say plainly that the profile has to be linked first rather than failing
 * with something the salon cannot act on.
 */
async function linkLocationAssets(token: string, customerId: string) {
  const res = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:search`, {
    method:  'POST',
    headers: adsHeaders(token),
    body:    JSON.stringify({
      query: `SELECT asset_set.resource_name, asset_set.type, asset_set.status
              FROM asset_set
              WHERE asset_set.type IN ('LOCATION_SYNC', 'BUSINESS_PROFILE_DYNAMIC_LOCATION_GROUP')
              LIMIT 5`,
    }),
  })
  if (!res.ok) throw new Error(`Fetch asset sets (${res.status}): ${await res.text()}`)

  const data = await res.json() as { results?: { assetSet: { resourceName: string } }[] }
  const set  = data.results?.[0]?.assetSet?.resourceName
  if (!set) return { applied: false as const, reason: 'profile_not_linked' as const }

  const campaigns = await enabledCampaigns(token, customerId)
  if (campaigns.length === 0) return { applied: false as const, reason: 'no_campaigns' as const }

  const linkRes = await fetch(`${ADS_BASE}/customers/${customerId}/campaignAssetSets:mutate`, {
    method:  'POST',
    headers: adsHeaders(token),
    body:    JSON.stringify({
      operations: campaigns.map(campaign => ({ create: { campaign, assetSet: set } })),
    }),
  })
  if (!linkRes.ok) throw new Error(`Link location set (${linkRes.status}): ${await linkRes.text()}`)

  return { applied: true as const }
}

export async function POST(req: NextRequest) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin   = c.admin
  const company = { id: c.id }
const body = await req.json() as Body

  const { data: conn } = await admin
    .from('google_connections').select('ads_customer_id').eq('company_id', company.id).single()

  // Nothing to write to. Say so — do not report success.
  if (!conn?.ads_customer_id) return notApplied('no_ads_account')

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  const customerId = conn.ads_customer_id.replace(/-/g, '')

  try {
    if (body.type === 'call') {
      const phone = body.phone?.trim()
      if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 })
      /* Sweden for now, alongside the rest of the market handling — the country
         belongs to the number, and Google rejects a mismatched pair. */
      const result = await createAndLink(
        token, customerId,
        [{ callAsset: { countryCode: 'SE', phoneNumber: phone } }],
        'CALL',
      )
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.type === 'sitelinks') {
      const links = (body.sitelinks ?? []).filter(l => l.title?.trim() && l.url?.trim())
      if (!links.length) return NextResponse.json({ error: 'sitelinks are required' }, { status: 400 })
      const result = await createAndLink(
        token, customerId,
        links.map(l => ({
          finalUrls:    [l.url.trim()],
          sitelinkAsset: {
            linkText:     l.title.trim(),
            ...(l.description?.trim() ? { description1: l.description.trim() } : {}),
          },
        })),
        'SITELINK',
      )
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.type === 'callout') {
      if (!body.callouts?.length) {
        return NextResponse.json({ error: 'callouts are required' }, { status: 400 })
      }
      const result = await createAndLink(
        token, customerId,
        body.callouts.map(text => ({ calloutAsset: { calloutText: text } })),
        'CALLOUT',
      )
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.type === 'structured_snippet') {
      const values = (body.values ?? []).map(v => v.trim()).filter(Boolean)
      if (!body.header || values.length < 3) {
        return NextResponse.json({ error: 'header and at least 3 values are required' }, { status: 400 })
      }
      const result = await createAndLink(
        token, customerId,
        [{ structuredSnippetAsset: { header: body.header, values } }],
        'STRUCTURED_SNIPPET',
      )
      return NextResponse.json({ ok: true, ...result })
    }

    if (body.type === 'location') {
      const result = await linkLocationAssets(token, customerId)
      return NextResponse.json({ ok: true, ...result })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (err) {
    console.error('[update-extensions]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    )
  }
}
