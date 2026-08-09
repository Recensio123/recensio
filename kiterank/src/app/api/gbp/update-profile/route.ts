import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken }     from '@/lib/google'

// PATCH /api/gbp/update-profile
// Body: { field: 'description', value: string }
//     | { field: 'phone',       value: string }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies').select('id').eq('user_id', user.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { data: conn } = await admin
    .from('google_connections').select('gbp_location_id').eq('company_id', company.id).single()
  if (!conn?.gbp_location_id)
    return NextResponse.json({ error: 'No Google Business Profile connected' }, { status: 400 })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  const { field, value } = (await req.json()) as { field: 'description' | 'phone'; value: string }

  if (!field || !['description', 'phone'].includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
  }
  if (value === undefined || value === null) {
    return NextResponse.json({ error: 'Value required' }, { status: 400 })
  }

  try {
    const locationName = conn.gbp_location_id // e.g. "accounts/123/locations/456"

    let body: Record<string, unknown>
    let updateMask: string

    if (field === 'description') {
      body       = { profile: { description: value.trim() } }
      updateMask = 'profile.description'
    } else {
      body       = { phoneNumbers: { primaryPhone: value.trim() } }
      updateMask = 'phoneNumbers.primaryPhone'
    }

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}?updateMask=${updateMask}`,
      {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      },
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GBP update (${res.status}): ${text}`)
    }

    return NextResponse.json({ ok: true, field, value: value.trim() })
  } catch (err) {
    console.error('[update-profile]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Profile update failed' },
      { status: 500 },
    )
  }
}
