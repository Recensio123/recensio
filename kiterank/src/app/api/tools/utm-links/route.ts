import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/tools/utm-links — fetch all links for this company
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ links: [] })

  const { data: links } = await admin
    .from('utm_links')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ links: links ?? [] })
}

// POST /api/tools/utm-links — save a new link
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { full_url, short_url, source, medium, campaign, term } = body

  if (!full_url || !source || !medium || !campaign) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const { data, error } = await admin
    .from('utm_links')
    .insert({ company_id: company.id, full_url, short_url, source, medium, campaign, term: term || null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ link: data })
}
