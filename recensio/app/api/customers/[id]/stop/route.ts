import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data: userData } = await admin.from('users').select('company_id').eq('id', user.id).single()
  if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await admin
    .from('customers')
    .update({ status: 'stopped', scheduled_for: null })
    .eq('id', id)
    .eq('company_id', userData.company_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
