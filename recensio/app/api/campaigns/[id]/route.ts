import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  template: z.string().min(1).optional(),
  timing_hours: z.number().int().min(0).max(720).optional(),
  timing_after: z.enum(['job', 'review']).optional(),
  neg_filter: z.boolean().optional(),
  active: z.boolean().optional(),
})

async function getCompanyId(userId: string) {
  const admin = createSupabaseAdminClient()
  const { data } = await admin.from('users').select('company_id').eq('id', userId).single()
  return data?.company_id as string | undefined
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const companyId = await getCompanyId(user.id)
  if (!companyId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('campaigns')
    .update(parsed.data)
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCompanyId(user.id)
  if (!companyId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
