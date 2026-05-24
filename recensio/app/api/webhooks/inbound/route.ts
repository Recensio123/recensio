import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { normalizeSwedishPhone } from '@/lib/phone'

const STOP_WORDS = ['stopp', 'stop', 'avregistrera', 'unsubscribe', 'avslutar']

export async function POST(request: NextRequest) {
  const body = await request.formData()
  const from = body.get('from') as string
  const message = (body.get('message') as string ?? '').toLowerCase().trim()

  if (!from) return NextResponse.json({ ok: true })

  const isStopRequest = STOP_WORDS.some(w => message.includes(w))
  if (!isStopRequest) return NextResponse.json({ ok: true })

  const normalizedPhone = normalizeSwedishPhone(from)
  const admin = createSupabaseAdminClient()

  const { data: customers } = await admin
    .from('customers')
    .select('id, company_id, phone')
    .eq('phone', normalizedPhone)

  if (!customers?.length) return NextResponse.json({ ok: true })

  for (const customer of customers) {
    await admin.from('customers').update({ status: 'stopped' }).eq('id', customer.id)
    await admin.from('consent_log').insert({
      company_id: customer.company_id,
      customer_phone: normalizedPhone,
      action: 'opted_out',
      legal_basis: 'legitimate_interest',
    })
  }

  return NextResponse.json({ ok: true })
}
