import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'

export async function GET() {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = c.admin

  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('id', c.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!company) return NextResponse.json({ reviews: [] })

  const { data: reviews } = await admin
    .from('gbp_reviews')
    .select('review_id, author, rating, text, published_at, reply')
    .eq('company_id', company.id)
    .not('text', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ reviews: reviews ?? [] })
}
