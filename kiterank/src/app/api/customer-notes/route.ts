import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { hämtaAnteckningar, sparaAnteckning, MAX_ANTECKNING } from '@/lib/kundanteckning'

/*
 * Personalens anteckningar om kunderna.
 *
 * Läses av salongen, inte av kunden — det finns ingen väg hit utan en
 * inloggning som hör till företaget, och anteckningen går aldrig ut i ett
 * utskick.
 *
 * Hela uppslagstabellen i ett svar. Kommandelistan och historiken visar många
 * kunder samtidigt, och en fråga per kundrad hade blivit trettio anrop för en
 * vy som ritas en gång.
 */

export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ notes: await hämtaAnteckningar(createAdminClient(), access.companyId) })
}

export async function PUT(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => null)
  const nyckel = typeof b?.key === 'string' ? b.key.trim() : ''
  const text   = typeof b?.note === 'string' ? b.note : ''

  /* Nyckeln räknas fram ur kundens uppgifter och har alltid en av tre former.
     Något annat är inte en kund utan ett anrop som hittat på en, och den raden
     hade ingen kunnat hitta igen. */
  if (!/^(tel|post|namn):.+/.test(nyckel) || nyckel.length > 200) {
    return NextResponse.json({ error: 'invalid_key' }, { status: 400 })
  }
  if (text.length > MAX_ANTECKNING) {
    return NextResponse.json({ error: 'too_long' }, { status: 400 })
  }

  const ok = await sparaAnteckning(
    createAdminClient(), access.companyId, nyckel, text, access.email,
  )

  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'save_failed' }, { status: 500 })
}
