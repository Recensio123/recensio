import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login`)
  }

  // Encode user ID as state for CSRF protection (user is already authenticated)
  const state = Buffer.from(user.id).toString('base64url')
  return NextResponse.redirect(getAuthUrl(state))
}
