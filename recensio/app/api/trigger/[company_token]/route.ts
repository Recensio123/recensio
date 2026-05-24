import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { inngest } from '@/lib/inngest'
import { triggerRatelimit, getIp } from '@/lib/rate-limit'

const TriggerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(6).max(20),
  platform: z.enum(['google', 'reco', 'hittaproffs', 'facebook']).default('google'),
  delay_hours: z.number().int().min(0).max(720).optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ company_token: string }> }) {
  const { company_token } = await params
  const ip = getIp(request)
  const authHeader = request.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  const { success } = await triggerRatelimit.limit(apiKey)
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const admin = createSupabaseAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('*')
    .eq('id', company_token)
    .single()

  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const body = await request.json()
  const parsed = TriggerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const delayHours = parsed.data.delay_hours ?? company.sms_timing_hours ?? 1
  const scheduledFor = new Date(Date.now() + delayHours * 3600 * 1000).toISOString()

  const { data: customer, error } = await admin
    .from('customers')
    .upsert({
      company_id: company.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      platform: parsed.data.platform,
      status: 'pending',
      scheduled_for: scheduledFor,
      source: 'webhook',
    }, { onConflict: 'company_id,phone', ignoreDuplicates: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await inngest.send({
    name: 'sms/scheduled',
    data: { customerId: customer.id, companyId: company.id, scheduledFor },
  })

  return NextResponse.json({ ok: true, customerId: customer.id }, { status: 201 })
}
