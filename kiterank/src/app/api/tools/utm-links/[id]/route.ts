import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ id: string }> }

async function getCompanyId(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('companies').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// PATCH /api/tools/utm-links/[id] — update a link
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCompanyId(user.id)
  if (!companyId) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const body = await req.json()
  const { full_url, source, medium, campaign, term, short_url } = body

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('utm_links')
    .update({ full_url, source, medium, campaign, term: term || null, short_url: short_url || null })
    .eq('id', id)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}

// DELETE /api/tools/utm-links/[id] — remove a link
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getCompanyId(user.id)
  if (!companyId) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('utm_links')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
