import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      const { data: company } = await admin
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .single()

      // New user — send to onboarding
      if (!company) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/hub`)
}
