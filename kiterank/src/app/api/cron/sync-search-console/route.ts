import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncSearchConsole } from '@/lib/sync'

// Called by Vercel cron once per day.
// Search Console data updates daily so more frequent syncing is wasteful.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: connections } = await admin
    .from('google_connections')
    .select('company_id')
    .not('refresh_token', 'is', null)

  if (!connections?.length) return NextResponse.json({ synced: 0 })

  const results = await Promise.allSettled(
    connections.map(({ company_id }) => syncSearchConsole(company_id))
  )

  const synced = results.filter(r => r.status === 'fulfilled' && r.value !== null).length
  return NextResponse.json({ synced, total: connections.length })
}
