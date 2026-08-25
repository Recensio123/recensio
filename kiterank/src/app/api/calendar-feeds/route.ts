import { NextResponse } from 'next/server'
import { currentAccess, canManageSalon } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { säkraFeed, bytFeed, hämtaFeeds } from '@/lib/kalenderfeed'
import { fetchStaff } from '@/lib/staffQuery'

/*
 * Salongens prenumerationslänkar.
 *
 * Skapas när de visas första gången. En salong som aldrig öppnar
 * kalendersynken ska inte ha hemliga adresser liggande som ingen känner till
 * och därför ingen byter ut.
 *
 * Bara salongen. En enskild stols länk är i praktiken tillgång till den stolens
 * kunder, och vem som får se dem är ägarens beslut och inte den anställdes.
 */

export async function GET() {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin     = createAdminClient()
  const companyId = access!.companyId

  const personal = (await fetchStaff(admin, companyId)) ?? []

  /* Salongens hela schema först, sedan en per stol. Skapas parallellt — de rör
     olika rader och har ingen anledning att vänta på varandra. */
  const [salong, stolar] = await Promise.all([
    säkraFeed(admin, companyId, null),
    Promise.all(personal.map(async s => ({
      staffId: s.id,
      namn:    s.name,
      token:   await säkraFeed(admin, companyId, s.id),
    }))),
  ])

  /* Stämplarna säger om prenumerationen lever — svaret på "varför syns inget i
     min telefon?". */
  const feeds = await hämtaFeeds(admin, companyId)
  const senast = Object.fromEntries(feeds.map(f => [f.token, f.senast]))

  return NextResponse.json({
    salong: salong ? { token: salong, senast: senast[salong] ?? null } : null,
    stolar: stolar
      .filter((s): s is { staffId: string; namn: string; token: string } => Boolean(s.token))
      .map(s => ({ ...s, senast: senast[s.token] ?? null })),
  })
}

/* Byter ut en länk. Den gamla slutar fungera direkt — det är hela avsikten. */
export async function POST(req: Request) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const staffId = typeof b?.staffId === 'string' && b.staffId ? b.staffId : null

  const token = await bytFeed(createAdminClient(), access!.companyId, staffId)

  return token
    ? NextResponse.json({ token })
    : NextResponse.json({ error: 'save_failed' }, { status: 500 })
}
