import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, country, city, postal_code, industry, website } = body

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const updates: Record<string, string | null> = {}
  if (name        !== undefined) updates.name        = name        || null
  if (country     !== undefined) updates.country     = country     || null
  if (city        !== undefined) updates.city        = city        || null
  if (postal_code !== undefined) updates.postal_code = postal_code || null
  if (industry    !== undefined) updates.industry    = industry    || null
  if (website     !== undefined) updates.website     = website     || null

  const { error } = await admin
    .from('companies')
    .update(updates)
    .eq('id', company.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
