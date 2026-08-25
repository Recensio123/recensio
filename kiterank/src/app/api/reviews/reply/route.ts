import { NextRequest, NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { getValidToken, replyToReview } from '@/lib/google'

export async function POST(req: NextRequest) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const company = { id: c.id }
  const { reviewName, comment } = await req.json()
  if (!reviewName || !comment?.trim()) {
    return NextResponse.json({ error: 'reviewName and comment are required' }, { status: 400 })
  }

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
