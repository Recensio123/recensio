import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken, publishPost, PostCTAType } from '@/lib/google'

// GET — list posts for the company
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ posts: [] })

  const { data: posts } = await admin
    .from('gbp_posts')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ posts: posts ?? [] })
}

// POST — publish a new post to GBP and record it
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { text, imageUrl, ctaType, ctaUrl, scheduledAt } = body as {
    text:          string
    imageUrl?:     string
    ctaType?:      PostCTAType
    ctaUrl?:       string
    scheduledAt?:  string   // ISO string — if present, schedule instead of publish immediately
  }

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Post text is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const { data: conn } = await admin
    .from('google_connections')
    .select('gbp_location_id')
    .eq('company_id', company.id)
    .single()

  // ── Scheduled post — store for later, do not publish now ──────────────────
  if (scheduledAt) {
    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return NextResponse.json({ error: 'scheduledAt must be a future date' }, { status: 400 })
    }

    const { data: post, error: insertErr } = await admin
      .from('gbp_posts')
      .insert({
        company_id:   company.id,
        body:         text.trim(),
        image_url:    imageUrl  || null,
        cta_type:     ctaType   || null,
        cta_url:      ctaUrl    || null,
        status:       'scheduled',
        scheduled_at: scheduledDate.toISOString(),
      })
      .select()
      .single()

    if (insertErr || !post) {
      return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, status: 'scheduled', postId: post.id, scheduledAt: post.scheduled_at })
  }

  // ── Immediate publish ───────────────────────────────────────────────────────
  // Insert as 'draft' first so we have an ID
  const { data: post, error: insertErr } = await admin
    .from('gbp_posts')
    .insert({
      company_id: company.id,
      body:       text.trim(),
      image_url:  imageUrl  || null,
      cta_type:   ctaType   || null,
      cta_url:    ctaUrl    || null,
      status:     'draft',
    })
    .select()
    .single()

  if (insertErr || !post) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Attempt live publish if connected
  const token = await getValidToken(company.id)
  if (token && conn?.gbp_location_id) {
    try {
      const result = await publishPost(token, conn.gbp_location_id, {
        text:     text.trim(),
        imageUrl: imageUrl  || undefined,
        ctaType:  ctaType   || undefined,
        ctaUrl:   ctaUrl    || undefined,
      })
      await admin
        .from('gbp_posts')
        .update({
          status:        'published',
          published_at:  new Date().toISOString(),
          gbp_post_name: result.name ?? null,
        })
        .eq('id', post.id)
      return NextResponse.json({ ok: true, status: 'published', postId: post.id })
    } catch (err) {
      await admin.from('gbp_posts').update({ status: 'failed' }).eq('id', post.id)
      const msg = err instanceof Error ? err.message : 'Publish failed'
      return NextResponse.json({ error: msg, status: 'failed', postId: post.id }, { status: 500 })
    }
  }

  // No live connection — mark as mock-published
  await admin
    .from('gbp_posts')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', post.id)

  return NextResponse.json({ ok: true, status: 'published_mock', postId: post.id })
}
