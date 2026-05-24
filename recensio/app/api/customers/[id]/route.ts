import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

const UpdateSchema = z.object({
  custom_message:    z.string().optional().nullable(),
  scheduled_for:     z.string().optional().nullable(),
  custom_campaign_id: z.string().uuid().optional().nullable(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: customer, error } = await admin
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (error || !customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch SMS log entries for this customer
  const { data: smsLog } = await admin
    .from('sms_log')
    .select('*, campaigns(name)')
    .eq('customer_id', id)
    .order('sent_at', { ascending: true })

  return NextResponse.json({ ...customer, sms_log: smsLog ?? [] })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await admin
    .from('customers')
    .update(parsed.data)
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
