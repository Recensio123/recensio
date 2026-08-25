import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken }     from '@/lib/google'
import { type GBPHoursPeriod } from '@/app/(kiterank)/dashboard/gbp/types'

// PATCH /api/gbp/update-hours
// Body: { periods: GBPHoursPeriod[] }
export async function PATCH(req: NextRequest) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin   = c.admin
  const company = { id: c.id }
const { data: conn } = await admin
    .from('google_connections').select('gbp_location_id').eq('company_id', company.id).single()

  // Mock mode — no real GBP connected
  if (!conn?.gbp_location_id) return NextResponse.json({ ok: true })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  const { periods } = (await req.json()) as { periods: GBPHoursPeriod[] }

  if (!Array.isArray(periods)) {
    return NextResponse.json({ error: 'periods must be an array' }, { status: 400 })
  }

  try {
    const locationName = conn.gbp_location_id // e.g. "accounts/123/locations/456"

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}?updateMask=regularHours`,
      {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ regularHours: { periods } }),
      },
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GBP update (${res.status}): ${text}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update-hours]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Hours update failed' },
      { status: 500 },
    )
  }
}
