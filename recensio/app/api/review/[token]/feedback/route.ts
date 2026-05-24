import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { reviewRatelimit, getIp } from '@/lib/rate-limit'

const FeedbackSchema = z.object({
  feedback: z.string().min(1).max(2000),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: token_ } = await params
  const token = token_
  const ip = getIp(request)
  const { success } = await reviewRatelimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json()
  const parsed = FeedbackSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: review } = await admin
    .from('review_responses')
    .select('*')
    .eq('token', token)
    .single()

  if (!review) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

  await admin.from('review_responses').update({
    private_feedback: parsed.data.feedback,
  }).eq('token', token)

  await admin.from('customers').update({
    review_text: parsed.data.feedback,
  }).eq('id', review.customer_id)

  return NextResponse.json({ ok: true })
}
