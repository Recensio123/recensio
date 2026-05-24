import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { hashIp } from '@/lib/crypto'
import { reviewRatelimit, getIp } from '@/lib/rate-limit'

const StarSchema = z.object({
  stars: z.number().int().min(1).max(5),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: token_ } = await params
  const token = token_
  const ip = getIp(request)
  const { success } = await reviewRatelimit.limit(ip)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const body = await request.json()
  const parsed = StarSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = createSupabaseAdminClient()
  const { data: review } = await admin
    .from('review_responses')
    .select('*, companies(*), customers(*)')
    .eq('token', token)
    .single()

  if (!review) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  if (review.responded_at) return NextResponse.json({ error: 'Already responded' }, { status: 409 })

  const { stars } = parsed.data
  const hashedIp = hashIp(ip)

  await admin.from('review_responses').update({
    stars,
    ip_address: hashedIp,
    responded_at: new Date().toISOString(),
  }).eq('token', token)

  await admin.from('customers').update({
    stars,
    status: stars >= 4 ? 'reviewed' : 'private',
    review_given_at: new Date().toISOString(),
  }).eq('id', review.customer_id)

  const company = review.companies
  let redirectUrl: string | null = null

  if (stars >= 4) {
    if (company.google_place_id) {
      redirectUrl = `https://search.google.com/local/writereview?placeid=${company.google_place_id}`
    } else if (company.reco_url) {
      redirectUrl = company.reco_url
    } else if (company.hitta_url) {
      redirectUrl = company.hitta_url
    }
  }

  return NextResponse.json({ stars, redirectUrl })
}
