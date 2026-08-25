import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken, fetchGoogleCategories } from '@/lib/google'

/*
 * POST /api/gbp/update-category   { categoryId: "gcid:nail_salon" } | { confirm: true }
 *
 * Sets the primary category on the customer's live Business Profile.
 *
 * This is the one field on the profile that decides which category searches
 * they can appear for at all, so it is worth changing — and worth being
 * careful about. The id is checked against the list Google publishes for the
 * market before anything is written: an id we cannot find there would either
 * be rejected by Google or, worse, accepted as something we did not mean.
 *
 * The stored copy is updated in the same breath so the checklist stops asking
 * before the next sync comes round.
 */
export async function POST(req: NextRequest) {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { categoryId, confirm } = await req.json() as { categoryId?: string; confirm?: boolean }
  if (!confirm && !categoryId?.startsWith('gcid:')) {
    return NextResponse.json({ error: 'categoryId or confirm is required' }, { status: 400 })
  }

  const admin = c.admin
  const { data: company } = await admin
    .from('companies').select('id, country').eq('id', c.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { data: conn } = await admin
    .from('google_connections')
    .select('gbp_location_id, gbp_primary_category_id')
    .eq('company_id', company.id)
    .maybeSingle()
  if (!conn?.gbp_location_id) return NextResponse.json({ ok: true, applied: false, reason: 'no_profile' })

  /* "It is correct" — nothing goes to Google, we just stop asking. */
  if (confirm) {
    if (!conn.gbp_primary_category_id) {
      return NextResponse.json({ ok: true, applied: false, reason: 'not_synced' })
    }
    await admin.from('google_connections')
      .update({ gbp_category_confirmed_id: conn.gbp_primary_category_id })
      .eq('company_id', company.id)
    return NextResponse.json({ ok: true, applied: true, confirmed: true })
  }

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  const list  = await fetchGoogleCategories(token, {
    regionCode:   (company.country ?? 'SE').toUpperCase().slice(0, 2),
    languageCode: 'sv',
  })
  const match = list.find(c => c.id === categoryId)
  if (!match) return NextResponse.json({ ok: true, applied: false, reason: 'unknown_category' })

  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${conn.gbp_location_id}?updateMask=categories`,
    {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ categories: { primaryCategory: { name: categoryId } } }),
    },
  )
  if (!res.ok) {
    return NextResponse.json({ error: `Google: ${res.status} ${await res.text()}` }, { status: 502 })
  }

  /* Changing it counts as confirming — they just told us what it should be. */
  await admin.from('google_connections').update({
    gbp_primary_category_id:    match.id,
    gbp_primary_category_label: match.label,
    gbp_category_confirmed_id:  match.id,
  }).eq('company_id', company.id)

  return NextResponse.json({ ok: true, applied: true, category: match })
}
