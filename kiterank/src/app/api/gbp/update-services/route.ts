import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken }     from '@/lib/google'

// PATCH /api/gbp/update-services
// Body: { services: string[] }
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

  const { services } = (await req.json()) as { services: string[] }

  if (!Array.isArray(services)) {
    return NextResponse.json({ error: 'services must be an array' }, { status: 400 })
  }

  try {
    const locationName = conn.gbp_location_id // e.g. "accounts/123/locations/456"

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}?updateMask=serviceList`,
      {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          serviceList: {
            freeFormServiceItems: services.map(s => ({
              label: { displayName: s, languageCode: 'en' },
            })),
          },
        }),
      },
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GBP update (${res.status}): ${text}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update-services]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Services update failed' },
      { status: 500 },
    )
  }
}
