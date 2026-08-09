import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const body = await req.json()
  const { content, template } = body

  const { error } = await admin
    .from('site_config')
    .update({
      content,
      // Only when the editor sends one — a missing field must never blank it
      ...(typeof template === 'string' && template ? { template } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', company.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
