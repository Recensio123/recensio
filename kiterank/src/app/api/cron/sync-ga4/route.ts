import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncGA4 } from '@/lib/sync'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: companies } = await admin
    .from('companies')
    .select('id')

  if (!companies?.length) return NextResponse.json({ synced: 0 })

  const results = await Promise.allSettled(
    companies.map(c => syncGA4(c.id))
  )

  const synced = results.filter(r => r.status === 'fulfilled' && r.value === true).length
  return NextResponse.json({ synced, total: companies.length })
}
