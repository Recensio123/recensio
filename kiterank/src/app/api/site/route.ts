import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // TODO: upsert into site_config once Supabase schema is in place
  // const { error } = await supabase.from('site_config').upsert({ owner_id: user.id, ...body })
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mock success during development
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: fetch from site_config table
  return NextResponse.json({ ok: true, data: null })
}
