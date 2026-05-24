import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

const CampaignSchema = z.object({
  name: z.string().min(1).max(100),
  template: z.string().min(1),
  timing_hours: z.number().int().min(0).max(720).default(24),
  timing_after: z.enum(['job', 'review']).default('job'),
  neg_filter: z.boolean().default(true),
  active: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await admin
    .from('campaigns')
    .select('*')
    .eq('company_id', userData.company_id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CampaignSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data, error } = await admin
    .from('campaigns')
    .insert({ ...parsed.data, company_id: userData.company_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
