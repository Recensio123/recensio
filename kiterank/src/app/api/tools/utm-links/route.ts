import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'

// GET /api/tools/utm-links — fetch all links for this company
export async function GET() {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  /* Salongens id kommer ur inloggningen. Att slå upp företaget en gång till
     för att kontrollera att det finns är en tur och retur till databasen som
     bara bekräftar något vi redan visste. */
  const { data: links } = await c.admin
    .from('utm_links')
    .select('*')
    .eq('company_id', c.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ links: links ?? [] })
}

// POST /api/tools/utm-links — save a new link
export async function POST(req: NextRequest) {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { full_url, short_url, source, medium, campaign, term } = body

  if (!full_url || !source || !medium || !campaign) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = c.admin
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('id', c.id)
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
