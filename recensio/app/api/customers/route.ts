import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'
import { inngest } from '@/lib/inngest'

const CustomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(6).max(20),
  platform: z.enum(['google', 'reco', 'hittaproffs', 'facebook']).default('google'),
  delay_hours: z.number().int().min(0).max(720).default(1),
  custom_campaign_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CustomerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const scheduledFor = new Date(Date.now() + parsed.data.delay_hours * 3600 * 1000).toISOString()

  const { data: customer, error } = await admin
    .from('customers')
    .insert({
      company_id: userData.company_id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      platform: parsed.data.platform,
      scheduled_for: scheduledFor,
      custom_campaign_id: parsed.data.custom_campaign_id,
      source: 'manual',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Customer with this phone already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await inngest.send({
    name: 'sms/scheduled',
    data: { customerId: customer.id, companyId: userData.company_id, scheduledFor },
  })

  return NextResponse.json(customer, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await admin
    .from('customers')
    .select('*, campaigns(name)')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
