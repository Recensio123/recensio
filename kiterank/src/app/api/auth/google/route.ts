import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google'

/** Kakan som bär tillståndssträngen mellan hitresan och återvändandet. */
export const OAUTH_STATE = 'kr_oauth_state'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login`)
  }

  /*
   * Slumpad tillståndssträng, sparad i en kaka.
   *
   * Var tidigare base64 av användarens id. Det är inte en hemlighet — det är
   * ett värde som härleds ur något en angripare kan känna till, och då skyddar
   * det inte mot det enda tillståndssträngen finns för: att någon lurar en
   * inloggad kund att fullfölja en Google-inloggning som inte är kundens egen.
   * Lyckas det hamnar angriparens Google-konto på salongens företag, och därmed
   * deras siffror i vår panel.
   *
   * Nu är strängen 32 slumpade byte som bara finns i kundens egen kaka.
   * httpOnly så att inget skript kan läsa den, och kortlivad eftersom en
   * inloggning som tar mer än tio minuter ändå har övergivits.
   */
  const state = randomBytes(32).toString('base64url')

  const res = NextResponse.redirect(getAuthUrl(state))
  res.cookies.set(OAUTH_STATE, state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',          // måste överleva återhoppet från Google
    path:     '/',
    maxAge:   600,
  })
  return res
}
