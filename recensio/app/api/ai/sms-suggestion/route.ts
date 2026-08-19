import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase'

const Schema = z.object({
  feedback: z.string().max(2000).optional(),
  customerName: z.string(),
  companyName: z.string(),
  type: z.enum(['response', 'followup']).default('response'),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { customerName, companyName, type } = parsed.data

  // TODO: ersätt med riktig Claude API när ANTHROPIC_API_KEY läggs till
  const suggestion = type === 'followup'
    ? `Hej ${customerName}! Tack för att du tog dig tid att lämna en recension 🙏 Vi hoppas vi får se dig igen. Tipsa gärna en vän om ${companyName}!`
    : `Hej ${customerName}! Tack för din feedback, vi beklagar att det inte mötte dina förväntningar. Vi på ${companyName} vill gärna göra det rätt — får vi ringa upp dig för att lösa det? 🙏`

  return NextResponse.json({ suggestion })
}
