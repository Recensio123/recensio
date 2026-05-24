import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { hashIp } from '@/lib/crypto'
import crypto from 'crypto'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: customer } = await admin
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const phoneHash = crypto.createHash('sha256').update(customer.phone).digest('hex')

  await admin.from('customers').update({
    name: 'Borttagen',
    phone: phoneHash,
    review_text: null,
    custom_message: null,
  }).eq('id', id)

  await admin.from('consent_log').insert({
    company_id: userData.company_id,
    customer_phone: customer.phone,
    action: 'data_deleted',
    legal_basis: 'legitimate_interest',
  })

  return NextResponse.json({ ok: true })
}
