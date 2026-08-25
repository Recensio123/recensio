import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken } from '@/lib/google'

// Representative mock attributes for a service / trades business
const MOCK_METADATA = [
  { attributeId: 'pay_credit_card',          valueType: 'BOOL', displayName: 'Credit card',          groupDisplayName: 'Payments' },
  { attributeId: 'pay_debit_card',           valueType: 'BOOL', displayName: 'Debit card',            groupDisplayName: 'Payments' },
  { attributeId: 'pay_mobile_nfc',           valueType: 'BOOL', displayName: 'NFC / contactless',     groupDisplayName: 'Payments' },
  { attributeId: 'pay_cash_only',            valueType: 'BOOL', displayName: 'Cash only',             groupDisplayName: 'Payments' },
  { attributeId: 'has_online_estimates',     valueType: 'BOOL', displayName: 'Online estimates',      groupDisplayName: 'Service options' },
  { attributeId: 'has_emergency_service',    valueType: 'BOOL', displayName: 'Emergency callout',     groupDisplayName: 'Service options' },
  { attributeId: 'requires_appointments',    valueType: 'BOOL', displayName: 'Appointment required',  groupDisplayName: 'Service options' },
  { attributeId: 'wheelchair_accessible_entrance', valueType: 'BOOL', displayName: 'Wheelchair accessible entrance', groupDisplayName: 'Accessibility' },
  { attributeId: 'is_women_led',             valueType: 'BOOL', displayName: 'Women-led',             groupDisplayName: 'Identifies as' },
  { attributeId: 'is_veteran_led',           valueType: 'BOOL', displayName: 'Veteran-led',           groupDisplayName: 'Identifies as' },
]

export async function GET() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin   = c.admin
  const company = { id: c.id }
const { data: conn } = await admin
    .from('google_connections').select('gbp_location_id').eq('company_id', company.id).single()

  // Mock mode
  if (!conn?.gbp_location_id) {
    return NextResponse.json({ metadata: MOCK_METADATA, current: [] })
  }

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  try {
    // Fetch available attribute metadata for this location
    const [metaRes, locRes] = await Promise.all([
      fetch(
        `https://mybusiness.googleapis.com/v4/attributes?name=${conn.gbp_location_id}&languageCode=en`,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
      fetch(
        `https://mybusiness.googleapis.com/v4/${conn.gbp_location_id}?readMask=attributes`,
        { headers: { Authorization: `Bearer ${token}` } },
      ),
    ])

    const [metaJson, locJson] = await Promise.all([metaRes.json(), locRes.json()])

    return NextResponse.json({
      metadata: metaJson.attributes ?? [],
      current:  locJson.attributes  ?? [],
    })
  } catch (err) {
    console.error('[gbp/attributes GET]', err)
    return NextResponse.json({ metadata: MOCK_METADATA, current: [] })
  }
}
