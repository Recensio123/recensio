import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/*
 * Den korta vägen till en bokning.
 *
 * Finns för SMS:et och ingenting annat. Den fullständiga adressen är omkring
 * åttio tecken, vilket är halva utrymmet i ett meddelande som betalas per
 * segment — och alternativet, att utelämna länken, lämnar kunden utan väg
 * tillbaka klockan halv elva på kvällen.
 *
 * Skickar vidare till den riktiga sidan i stället för att rendera något eget.
 * Två sidor som gör samma sak glider isär, och den som glider är alltid den
 * ingen tittar på.
 */

type Params = { params: Promise<{ kod: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { kod } = await params

  /* Bara det formatet vi själva skapar. En kod med andra tecken är antingen en
     felskrivning eller någon som letar, och båda ska mötas av samma svar som
     en kod som inte finns. */
  if (!/^[0-9a-f]{8,32}$/.test(kod)) return NextResponse.redirect(new URL('/', _req.url))

  const admin = createAdminClient()
  const { data } = await admin
    .from('bookings')
    .select('cancel_token, companies(slug)')
    .eq('cancel_code', kod)
    .maybeSingle()

  const slug  = (data?.companies as { slug?: string } | null)?.slug
  const token = data?.cancel_token as string | undefined

  /* Okänd kod leder till startsidan och inte till ett felmeddelande. Vi vet
     inte om det är en gammal bokning, en felskrivning eller någon som letar,
     och inget av det tjänar på ett besked om vad som saknas. */
  if (!slug || !token) return NextResponse.redirect(new URL('/', _req.url))

  return NextResponse.redirect(new URL(`/book/${slug}/avboka/${token}`, _req.url))
}
