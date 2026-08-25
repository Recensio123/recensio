import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { createClient } from '@/lib/supabase/server'
import { getValidToken, fetchMediaItems, createMediaItem, deleteMediaItem } from '@/lib/google'

export async function GET() {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = c.admin
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('id', c.id)
    .single()

  if (!company) return NextResponse.json({ items: [] })

  const { data: conn } = await admin
    .from('google_connections')
    .select('gbp_location_id')
    .eq('company_id', company.id)
    .single()

  if (!conn?.gbp_location_id) return NextResponse.json({ items: [] })

  try {
    const token = await getValidToken(company.id)
    if (!token) return NextResponse.json({ items: [] })

    const items = await fetchMediaItems(token, conn.gbp_location_id)
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}

// POST — upload a photo to GBP by URL
// Body: { url: string, category: string }
export async function POST(req: NextRequest) {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = c.admin
  const { data: company } = await admin
    .from('companies').select('id').eq('id', c.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const { data: conn } = await admin
    .from('google_connections').select('gbp_location_id').eq('company_id', company.id).single()
  if (!conn?.gbp_location_id)
    return NextResponse.json({ error: 'No Google Business Profile connected' }, { status: 400 })

  const { url, category } = (await req.json()) as { url: string; category: string }
  if (!url?.trim())      return NextResponse.json({ error: 'Image URL required' }, { status: 400 })
  if (!category?.trim()) return NextResponse.json({ error: 'Category required' },  { status: 400 })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  try {
    const result = await createMediaItem(token, conn.gbp_location_id, url.trim(), category.trim())
    return NextResponse.json({ ok: true, item: result })
  } catch (err) {
    console.error('[gbp/photos POST]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    )
  }
}

// DELETE — remove an owner-uploaded photo by its GBP media name
export async function DELETE(req: NextRequest) {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = c.admin
  const { data: company } = await admin
    .from('companies').select('id').eq('id', c.id).single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const { data: conn } = await admin
    .from('google_connections').select('gbp_location_id').eq('company_id', company.id).single()

  const { name } = (await req.json()) as { name: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Photo name required' }, { status: 400 })

  // Mock mode — no real connection yet, just acknowledge
  if (!conn?.gbp_location_id) return NextResponse.json({ ok: true, mock: true })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'Invalid token — reconnect Google' }, { status: 401 })

  try {
    await deleteMediaItem(token, name.trim())
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    )
  }
}
