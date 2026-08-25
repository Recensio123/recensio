import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/*
 * Den korta vägen till salongens sida för omdömen.
 *
 * En Google-länk för omdömen är fyrtio till femtio tecken och säger ingenting
 * för den som läser den. I ett SMS som betalas per segment är det dyrt utrymme,
 * och skillnaden mellan ett och två meddelanden per kund.
 *
 * Den här formen ligger dessutom på salongens egen adress när de har en. En
 * länk till klipphuset.se klickas av fler än en till g.page — kunden ser vem
 * som frågar, i ett SMS där avsändaren annars är det enda som säger det.
 *
 * Skickar vidare i stället för att rendera något eget: destinationen är
 * salongens, och sidan finns redan hos Google.
 */

type Params = { params: Promise<{ slug: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params

  const admin = createAdminClient()
  const { data } = await admin
    .from('companies')
    .select('review_url')
    .eq('slug', slug)
    .maybeSingle()

  const url = (data?.review_url as string | null)?.trim()

  /* Ingen länk sparad: startsidan snarare än ett felmeddelande. Kunden gjorde
     inget fel, och ett besked om vad salongen glömt hjälper dem inte. */
  if (!url || !/^https?:\/\/\S+$/.test(url)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.redirect(url)
}
