import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { syncAds } from '@/lib/sync'

export async function POST() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const company = { id: c.id }
const ok = await syncAds(company.id)
  if (!ok) return NextResponse.json({ error: 'Sync failed — check Ads API access' }, { status: 500 })

  return NextResponse.json({ success: true })
}
