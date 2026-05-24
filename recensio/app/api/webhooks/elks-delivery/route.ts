import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.formData()
  const elksId = body.get('id') as string
  const status = body.get('status') as string

  if (!elksId) return NextResponse.json({ ok: true })

  const admin = createSupabaseAdminClient()
  await admin
    .from('sms_log')
    .update({ status: status === 'delivered' ? 'delivered' : 'failed' })
    .eq('elks_id', elksId)

  return NextResponse.json({ ok: true })
}
