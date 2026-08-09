import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncSearchConsole } from '@/lib/sync'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const count = await syncSearchConsole(company.id)
  if (count === null) return NextResponse.json({ error: 'Sync failed' }, { status: 500 })

  return NextResponse.json({ success: true, keywords: count })
}
