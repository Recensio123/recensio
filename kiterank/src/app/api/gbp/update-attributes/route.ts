import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken } from '@/lib/google'

// Body: { attributes: { attributeId: string; values: boolean[] }[] }
export async function PATCH(req: NextRequest) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin   = c.admin
  const company = { id: c.id }
const { data: conn } = await admin
    .from('google_connections').select('gbp_location_id').eq('company_id', company.id).single()

  const { attributes } = (await req.json()) as {
    attributes: { attributeId: string; values: boolean[] }[]
  }

  // Mock mode
  if (!conn?.gbp_location_id) return NextResponse.json({ ok: true, mock: true })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  try {
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.gbp_location_id}?updateMask=attributes`,
      {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ attributes }),
      },
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err?.error?.message ?? 'Update failed')
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[gbp/update-attributes PATCH]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    )
  }
}
