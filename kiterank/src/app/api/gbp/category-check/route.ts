import { NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, fetchGoogleCategories } from '@/lib/google'
import { sortForTrade } from '@/lib/gbpCategories'

/*
 * GET /api/gbp/category-check
 *
 * What the Business Profile says the business is, and the list of what it
 * could say instead.
 *
 * No verdict. The category is Google's field and the customer's decision —
 * we show it in their own words, in their own language, and let them either
 * confirm it or pick another. The list comes from Google for their market, so
 * every option offered is one that actually exists.
 *
 * `confirmed` is true once they have told us the current one is right, so the
 * checklist stops asking. Changing the category on Google clears it, and the
 * question comes back for the new one.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies').select('id, industry, country').eq('user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { data: conn } = await admin
    .from('google_connections')
    .select('gbp_location_id, gbp_primary_category_id, gbp_primary_category_label, gbp_category_confirmed_id')
    .eq('company_id', company.id)
    .maybeSingle()

  if (!conn?.gbp_primary_category_id) {
    return NextResponse.json({
      current: null,
      reason:  conn?.gbp_location_id ? 'not_synced' : 'no_profile',
    })
  }

  const current = {
    id:    conn.gbp_primary_category_id,
    label: conn.gbp_primary_category_label ?? conn.gbp_primary_category_id,
  }

  const token = await getValidToken(company.id)
  const all   = token
    ? await fetchGoogleCategories(token, {
        regionCode:   (company.country ?? 'SE').toUpperCase().slice(0, 2),
        languageCode: 'sv',
      })
    : []

  return NextResponse.json({
    current,
    confirmed:  conn.gbp_category_confirmed_id === current.id,
    categories: sortForTrade(all, company.industry),
  })
}
