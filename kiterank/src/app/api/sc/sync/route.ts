import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { syncSearchConsole } from '@/lib/sync'

export async function POST() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const company = { id: c.id }
const count = await syncSearchConsole(company.id)
  if (count === null) return NextResponse.json({ error: 'Sync failed' }, { status: 500 })

  return NextResponse.json({ success: true, keywords: count })
}
