import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { sendSms } from '@/lib/elks'
import { decrypt } from '@/lib/crypto'

const Schema = z.object({
  message: z.string().min(1).max(1600),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: customer } = await admin
    .from('customers')
    .select('*, companies(*)')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const company = customer.companies
  const { message } = parsed.data

  const username = company.elks_username
  const password = company.elks_password_enc ? decrypt(company.elks_password_enc) : undefined

  const elksResult = await sendSms({
    to: customer.phone,
    message,
    from: company.sms_sender || 'Recensio',
    username,
    password,
  })

  const now = new Date().toISOString()

  await admin.from('sms_log').insert({
    company_id: userData.company_id,
    customer_id: customer.id,
    type: 'reply',
    message,
    recipient_phone: customer.phone,
    elks_id: elksResult.id,
    status: 'sent',
    sent_at: now,
  })

  await admin.from('customers').update({
    owner_response: message,
    owner_responded_at: now,
  }).eq('id', customer.id)

  return NextResponse.json({ ok: true })
}
