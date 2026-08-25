import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { syncGA4 } from '@/lib/sync'

export async function POST() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const company = { id: c.id }
const ok = await syncGA4(company.id)
  if (!ok) return NextResponse.json({ error: 'Sync failed or GA4 not connected' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
