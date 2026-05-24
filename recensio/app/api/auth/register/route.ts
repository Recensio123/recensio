import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { userId, email, name, companyName } = await request.json()
  if (!userId || !email || !companyName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({ name: companyName })
    .select()
    .single()

  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 })

  const { error: userError } = await admin.from('users').insert({
    id: userId,
    company_id: company.id,
    email,
    name,
    role: 'owner',
  })

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
