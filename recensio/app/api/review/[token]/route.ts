import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { hashIp } from '@/lib/crypto'
import { reviewRatelimit, getIp } from '@/lib/rate-limit'
import { sendEmail, reviewEmail } from '@/lib/email'

const StarSchema = z.object({
  stars: z.number().int().min(1).max(5),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createSupabaseAdminClient()
  const { data: review } = await admin
    .from('review_responses')
    .select('*, companies(name), customers(name)')
    .eq('token', token)
    .single()

  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (review.responded_at) return NextResponse.json({ error: 'Already responded' }, { status: 409 })

  const company = review.companies as { name: string }
  const customer = review.customers as { name: string }
  return NextResponse.json({
    companyName: company.name,
    firstName: customer.name.split(' ')[0],
  })
}

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
  const customer = review.customers
  let redirectUrl: string | null = null
  let redirectPlatform: string | null = null

  if (stars >= 4) {
    if (company.google_place_id) {
      redirectUrl = `https://search.google.com/local/writereview?placeid=${company.google_place_id}`
      redirectPlatform = 'google'
    } else if (company.reco_url) {
      redirectUrl = company.reco_url
      redirectPlatform = 'reco'
    } else if (company.hitta_url) {
      redirectUrl = company.hitta_url
      redirectPlatform = 'hitta'
    }

    if (redirectPlatform) {
      // Fetch active campaign for follow-up scheduling
      const { data: campaign } = await admin
        .from('campaigns')
        .select('id, timing_hours, template')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('created_at')
        .limit(1)
        .single()

      const followupAt = campaign
        ? new Date(Date.now() + campaign.timing_hours * 3600000).toISOString()
        : null

      await admin.from('customers').update({
        redirect_platform: redirectPlatform,
        ...(followupAt ? {
          followup_scheduled_at: followupAt,
          followup_campaign_id: campaign!.id,
          followup_message: campaign!.template,
        } : {}),
      }).eq('id', review.customer_id)
    }

    // Email notification for positive reviews
    const { data: companyUser } = await admin
      .from('users').select('id').eq('company_id', company.id).single()
    if (companyUser) {
      const { data: authUser } = await admin.auth.admin.getUserById(companyUser.id)
      const email = authUser.user?.email
      if (email) {
        const { subject, html } = reviewEmail({
          customerName: customer.name,
          companyName: company.name,
          stars,
          dashboardUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard/historik`,
        })
        await sendEmail({ to: email, subject, html })
      }
    }
  }

  return NextResponse.json({ stars, redirectUrl })
}
