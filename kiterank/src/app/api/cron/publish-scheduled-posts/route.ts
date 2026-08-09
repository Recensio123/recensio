import { NextResponse }       from 'next/server'
import { createAdminClient }  from '@/lib/supabase/admin'
import { getValidToken, publishPost, type PostCTAType } from '@/lib/google'

// GET /api/cron/publish-scheduled-posts
// Called by the cron scheduler — publishes any posts with status='scheduled'
// and scheduled_at <= now. Requires CRON_SECRET header.
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin  = createAdminClient()
  const now    = new Date().toISOString()

  // Fetch all due scheduled posts across all companies
  const { data: duePosts, error } = await admin
    .from('gbp_posts')
    .select('id, company_id, body, image_url, cta_type, cta_url')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (error) {
    console.error('[publish-scheduled-posts] fetch error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!duePosts?.length) {
    return NextResponse.json({ published: 0 })
  }

  let published = 0
  let failed    = 0

  for (const post of duePosts) {
    try {
      const { data: conn } = await admin
        .from('google_connections')
        .select('gbp_location_id')
        .eq('company_id', post.company_id)
        .single()

      if (!conn?.gbp_location_id) {
        await admin.from('gbp_posts').update({ status: 'failed' }).eq('id', post.id)
        failed++
        continue
      }

      const token = await getValidToken(post.company_id)
      if (!token) {
        await admin.from('gbp_posts').update({ status: 'failed' }).eq('id', post.id)
        failed++
        continue
      }

      const result = await publishPost(token, conn.gbp_location_id, {
        text:     post.body,
        imageUrl: post.image_url   ?? undefined,
        ctaType:  (post.cta_type as PostCTAType) ?? undefined,
        ctaUrl:   post.cta_url     ?? undefined,
      })

      await admin.from('gbp_posts').update({
        status:        'published',
        published_at:  new Date().toISOString(),
        gbp_post_name: result.name ?? null,
      }).eq('id', post.id)

      published++
    } catch (err) {
      console.error(`[publish-scheduled-posts] post ${post.id}`, err)
      await admin.from('gbp_posts').update({ status: 'failed' }).eq('id', post.id)
      failed++
    }
  }

  return NextResponse.json({ published, failed })
}
