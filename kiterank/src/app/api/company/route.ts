import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'

export async function PATCH(req: NextRequest) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin   = c.admin
  const company = { id: c.id }
  const body = await req.json()
  const { name, country, city, postal_code, industry, website } = body

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
