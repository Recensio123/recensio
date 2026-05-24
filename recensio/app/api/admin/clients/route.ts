import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('companies')
    .select('*, users(count), customers(count), sms_log(count)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
