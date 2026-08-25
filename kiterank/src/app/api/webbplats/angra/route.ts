import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import { isClosed } from '@/lib/accountStatus'
import { clearSiteCache } from '@/app/s/[slug]/site-data'
import { föregåendePublicering, återställSajt, PUBLICERING } from '@/lib/sidarkiv'

/*
 * Ångra senaste publiceringen.
 *
 * Ett steg bakåt, inte en historik att bläddra i. Den som råkat skriva över
 * sin startsida vill ha tillbaka gårdagens — de vill inte välja mellan sju
 * versioner de inte kan skilja åt.
 *
 * Fler steg finns i arkivet, men de ligger hos oss. En kund som behöver längre
 * tillbaka har ett problem som förtjänar ett samtal, inte en rullgardin.
 */

/** Finns det något att ångra? Panelen frågar innan den ritar knappen. */
export async function GET() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const förra = await föregåendePublicering(c.admin, c.id)
  return NextResponse.json({ finns: Boolean(förra), skapad: förra?.skapad ?? null })
}

export async function POST() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (await isClosed(c.admin, c.id)) {
    return NextResponse.json({ error: 'Avtalet är avslutat' }, { status: 403 })
  }

  const förra = await föregåendePublicering(c.admin, c.id)
  if (!förra) return NextResponse.json({ error: 'inget_att_angra' }, { status: 409 })

  /* Säkerhetskopian märks som en publicering, så att den gallras med de andra.
     Att ångra är i praktiken att publicera igen. */
  const svar = await återställSajt(c.admin, förra.id, { säkerhetskopia: PUBLICERING })
  if (!svar.ok) return NextResponse.json({ error: svar.skäl }, { status: 409 })

  clearSiteCache(c.id)
  return NextResponse.json({ ok: true, skapad: förra.skapad })
}
