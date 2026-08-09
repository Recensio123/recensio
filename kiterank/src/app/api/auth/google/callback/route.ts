import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCode, fetchAccounts, fetchLocations, fetchSCSites, fetchAdsCustomers, fetchGA4Properties } from '@/lib/google'

const APP = process.env.NEXT_PUBLIC_APP_URL!

// Maps GBP storefrontAddress.regionCode → companies.country value
const REGION_TO_COUNTRY: Record<string, string> = {
  SE: 'sweden', NO: 'norway',  DK: 'denmark',     FI: 'finland',
  DE: 'germany', CH: 'switzerland', AT: 'austria', NL: 'netherlands',
  GB: 'uk',      AU: 'australia',   US: 'us',       CA: 'canada',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(`${APP}/dashboard/connections?error=cancelled`)
  }

  // Verify the user is authenticated via their Supabase session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP}/auth/login`)

  // Verify state matches (CSRF protection)
  if (state !== Buffer.from(user.id).toString('base64url')) {
    return NextResponse.redirect(`${APP}/dashboard/connections?error=invalid_state`)
  }

  // Exchange auth code for tokens
  let tokens: { access_token: string; refresh_token: string; expires_in: number }
  try {
    tokens = await exchangeCode(code)
  } catch {
    return NextResponse.redirect(`${APP}/dashboard/connections?error=token_exchange`)
  }

  // Try to fetch GBP account + location — may fail until GBP API is approved
  let gbpAccountId  = ''
  let gbpLocationId = ''
  let businessName  = ''
  let gbpCity       = ''
  let gbpPostalCode = ''
  let gbpCountry    = ''
  let gbpIndustry   = ''
  let gbpWebsite    = ''

  try {
    const accounts = await fetchAccounts(tokens.access_token)
    if (accounts.length > 0) {
      gbpAccountId = accounts[0].name
      const locations = await fetchLocations(tokens.access_token, gbpAccountId)
      if (locations.length > 0) {
        const loc     = locations[0]
        gbpLocationId = loc.name
        businessName  = loc.title ?? ''
        gbpWebsite    = loc.websiteUri ?? ''
        gbpIndustry   = loc.categories?.primaryCategory?.displayName ?? ''
        // Prefer sublocality (district) over locality (city)
        const addr    = loc.storefrontAddress
        gbpCity       = addr?.sublocality || addr?.locality || ''
        gbpPostalCode = addr?.postalCode || ''
        gbpCountry    = REGION_TO_COUNTRY[addr?.regionCode ?? ''] ?? ''
      }
    }
  } catch {
    // GBP API not yet approved — store tokens anyway
  }

  // Try to detect Search Console site URL
  let scSiteUrl = ''
  try {
    const sites = await fetchSCSites(tokens.access_token)
    if (sites.length > 0) scSiteUrl = sites[0]
  } catch {
    // SC scope not granted or no verified sites
  }

  // Try to detect Google Ads customer ID
  let adsCustomerId = ''
  try {
    const customers = await fetchAdsCustomers(tokens.access_token)
    if (customers.length > 0) adsCustomerId = customers[0]
  } catch {
    // Requires Basic Access developer token — fails silently until approved
  }

  // Try to detect GA4 property ID
  let ga4PropertyId = ''
  try {
    const properties = await fetchGA4Properties(tokens.access_token)
    if (properties.length > 0) ga4PropertyId = properties[0]
  } catch {
    // analytics.readonly scope not granted or no GA4 properties
  }

  // Use admin client for DB writes to avoid RLS issues in server-side routes
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Country set at sign-up is stored in Supabase user metadata
  const signupCountry = (user.user_metadata?.country as string | undefined) ?? null

  let companyId: string
  if (existing) {
    companyId = existing.id
    const updates: Record<string, string> = {}
    if (businessName)  updates.name        = businessName
    if (gbpCity)       updates.city        = gbpCity
    if (gbpPostalCode) updates.postal_code = gbpPostalCode
    if (gbpIndustry)   updates.industry    = gbpIndustry
    if (gbpWebsite)    updates.website     = gbpWebsite
    // Only set country if not already set — GBP country wins over signup selection
    const { data: existingCompany } = await admin.from('companies').select('country').eq('id', companyId).single()
    if (!existingCompany?.country) updates.country = gbpCountry || signupCountry || ''
    if (Object.keys(updates).length > 0) {
      await admin.from('companies').update(updates).eq('id', companyId)
    }
  } else {
    const { data: created, error: createErr } = await admin
      .from('companies')
      .insert({
        user_id:     user.id,
        name:        businessName  || 'Your Business',
        country:     gbpCountry    || signupCountry || null,
        city:        gbpCity       || null,
        postal_code: gbpPostalCode || null,
        industry:    gbpIndustry   || null,
        website:     gbpWebsite    || null,
      })
      .select('id')
      .single()
    if (createErr || !created) {
      const msg = encodeURIComponent(createErr?.message ?? 'unknown')
      return NextResponse.redirect(`${APP}/dashboard/connections?error=db&detail=${msg}`)
    }
    companyId = created.id
  }

  // Store OAuth tokens
  const { error: connErr } = await admin.from('google_connections').upsert(
    {
      company_id:       companyId,
      gbp_account_id:   gbpAccountId,
      gbp_location_id:  gbpLocationId,
      sc_site_url:      scSiteUrl      || null,
      ads_customer_id:  adsCustomerId  || null,
      ga4_property_id:  ga4PropertyId  || null,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connected_at:     new Date().toISOString(),
    },
    { onConflict: 'company_id' }
  )

  if (connErr) {
    const msg = encodeURIComponent(connErr.message)
    return NextResponse.redirect(`${APP}/dashboard/connections?error=db&detail=${msg}`)
  }

  return NextResponse.redirect(`${APP}/dashboard/settings?connected=true`)
}
