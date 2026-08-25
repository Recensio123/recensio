import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_KAKA, VY_KAKA, läsVy } from '@/lib/datalage'

/*
 * Byter vy.
 *
 * Öppet för varje inloggad kund, inte bara för den som driver plattformen. Ett
 * tomt konto säljer ingenting, och en kund på prov behöver kunna se vad de får
 * innan de gjort jobbet.
 *
 * Skyddet ligger inte i behörigheten utan i att lägena aldrig går att förväxla
 * med det egna kontot: ett band överst på varje sida säger vilken vy man står
 * i, och det går inte att stänga. Kakan är dessutom knuten till sessionen och
 * försvinner när webbläsaren stängs — ingen ska kunna komma tillbaka en vecka
 * senare och tro att det är deras data.
 */

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const kropp = await req.json().catch(() => ({}))

  /* Två former av samma begäran. `vy` är den nuvarande; `på` är av/på-växeln
     som fanns innan guiden gjorde lägena tre, och som ligger kvar i knappar som
     bara vill ta sig ur ett läge. */
  const vy = kropp.vy !== undefined
    ? läsVy(kropp.vy)
    : (kropp.på ? 'mock' : 'kund')

  const res = NextResponse.json({ ok: true, vy })

  if (vy === 'kund') res.cookies.delete(VY_KAKA)
  else               res.cookies.set(VY_KAKA, vy, { httpOnly: true, sameSite: 'lax', path: '/' })

  /* Den gamla kakan städas bort oavsett. Låg den kvar skulle den läsas som
     mockläge nästa gång någon lämnar guiden. */
  res.cookies.delete(MOCK_KAKA)

  return res
}
