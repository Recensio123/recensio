import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { sendSms, renderTemplate } from '@/lib/elks'
import { decrypt } from '@/lib/crypto'
import { fetchDiscountCode } from '@/app/api/integrations/discount/route'
import crypto from 'crypto'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createSupabaseAdminClient()

  let companyId: string
  if (user) {
    const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    companyId = userData.company_id
  } else {
    const body = await request.json().catch(() => ({}))
    if (body.companyId) {
      companyId = body.companyId
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { data: customer } = await admin
    .from('customers')
    .select('*, companies(*), campaigns(*)')
    .eq('id', id)
    .eq('company_id', companyId)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  if (customer.status === 'stopped') return NextResponse.json({ error: 'Customer SMS stopped' }, { status: 400 })

  const company = customer.companies
  const campaign = customer.campaigns || await admin.from('campaigns').select('*').eq('company_id', companyId).eq('active', true).order('created_at').limit(1).single().then(r => r.data)

  const template = customer.custom_message || campaign?.template || company.sms_template
  const token = crypto.randomBytes(16).toString('hex')
  const reviewUrl = `${process.env.NEXT_PUBLIC_URL}/r/${token}`

  // Hämta rabattkod om mallen innehåller {rabattkod} och integration är kopplad
  let discountCode: string | null = null
  if (template.includes('{rabattkod}')) {
    discountCode = await fetchDiscountCode(companyId)
  }

  const rendered = renderTemplate(template, customer, company, token)
  const message = (discountCode !== null
    ? rendered.replace(/\{rabattkod\}/g, discountCode)
    : rendered) +
    `\n\n${reviewUrl}\n\nSvara STOPP för att avregistrera dig.`

  const username = company.elks_username
  const password = company.elks_password_enc ? decrypt(company.elks_password_enc) : undefined

  const elksResult = await sendSms({
    to: customer.phone,
    message,
    from: company.sms_sender || 'Recensio',
    deliveryWebhook: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/elks-delivery`,
    username,
    password,
  })

  await admin.from('review_responses').insert({
    company_id: companyId,
    customer_id: customer.id,
    token,
  })

  await admin.from('sms_log').insert({
    company_id: companyId,
    customer_id: customer.id,
    type: 'outbound',
    message,
    recipient_phone: customer.phone,
    elks_id: elksResult.id,
    status: 'sent',
  })

  await admin.from('customers').update({
    status: 'sent',
    sms_sent_at: new Date().toISOString(),
    scheduled_for: null,
    outbound_sms: message,
  }).eq('id', customer.id)

  await admin.from('consent_log').insert({
    company_id: companyId,
    customer_phone: customer.phone,
    action: 'sms_sent',
    legal_basis: 'legitimate_interest',
  })

  return NextResponse.json({ ok: true, elksId: elksResult.id })
}
