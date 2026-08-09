import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, replyToReview } from '@/lib/google'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewName, comment } = await req.json()
  if (!reviewName || !comment?.trim()) {
    return NextResponse.json({ error: 'reviewName and comment are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const token = await getValidToken(company.id)
  if (!token) return NextResponse.json({ error: 'No Google connection' }, { status: 400 })

  try {
    const result = await replyToReview(token, reviewName, comment.trim())
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
