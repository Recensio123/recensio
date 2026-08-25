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

      /*
       * Ny användare — vidare till registreringen.
       *
       * Paketvalet från startsidan följer med genom Google-inloggningen i
       * `vidare`. Utan det tappas valet i det ögonblick någon loggar in med
       * Google, och den som klickat på ett formgivet paket landar i mallflödet
       * utan att förstå varför.
       *
       * Bara egna adresser accepteras. En vidarebefordran som tar vad som
       * helst är en öppen omdirigering, och den syns aldrig förrän någon
       * använder den i ett nätfiskemejl.
       */
      if (!company) {
        const vidare = searchParams.get('vidare') ?? ''
        const säker = vidare.startsWith('/') && !vidare.startsWith('//')
        return NextResponse.redirect(`${origin}${säker ? vidare : '/onboarding'}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/hub`)
}
