import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { snapshot, benchmarks } = await request.json()

  const prompt = `You are a Google Business Profile expert helping a small business owner improve their online presence.

Here is their current data:
- Rating: ${snapshot.rating} stars (${snapshot.review_count} reviews, responded to ${snapshot.reviews_responded})
- Last post: ${snapshot.last_post_date} (${snapshot.posts_last_30_days} posts in last 30 days)
- Photos: ${snapshot.photos_count}
- Impressions last 30 days: ${snapshot.impressions_last_30_days}
- Website clicks: ${snapshot.website_clicks}
- Direction requests: ${snapshot.direction_requests}

Their benchmark scores (out of 100, top performers average ${benchmarks.top_performer_avg}):
- Overall: ${benchmarks.overall_score}
- Reputation: ${benchmarks.reputation_score}
- Visibility: ${benchmarks.visibility_score}
- Engagement: ${benchmarks.engagement_score}
- Content: ${benchmarks.content_score}
- Conversion: ${benchmarks.conversion_score}

Top search queries finding them: ${JSON.stringify(snapshot.search_queries)}

Return exactly 3 action items as a JSON array. Each item must have:
- priority: number (1-3)
- title: short imperative title (max 8 words)
- description: 1-2 sentences explaining what to do and why, using their specific numbers
- template: a ready-to-copy message template if relevant (null otherwise)
- impact: "high" | "medium" | "low"

Return only valid JSON, no markdown, no explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const actions = JSON.parse(text)

  return NextResponse.json({ actions })
}
