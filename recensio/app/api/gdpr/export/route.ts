import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const companyId = userData.company_id

  const [customers, campaigns, smsLog, reviewResponses, consentLog] = await Promise.all([
    admin.from('customers').select('*').eq('company_id', companyId),
    admin.from('campaigns').select('*').eq('company_id', companyId),
    admin.from('sms_log').select('*').eq('company_id', companyId),
    admin.from('review_responses').select('*').eq('company_id', companyId),
    admin.from('consent_log').select('*').eq('company_id', companyId),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    company_id: companyId,
    customers: customers.data,
    campaigns: campaigns.data,
    sms_log: smsLog.data,
    review_responses: reviewResponses.data,
    consent_log: consentLog.data,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="recensio-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
