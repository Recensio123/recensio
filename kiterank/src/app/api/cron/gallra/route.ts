import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gallraForetag } from '@/lib/gallring'

/*
 * Nattlig gallring av kunduppgifter.
 *
 * Automatisk med flit. En regel som kräver att någon trycker på en knapp varje
 * kvartal är ingen regel — den fungerar tills det blir mycket att göra, och
 * sedan aldrig mer. Det här är den enda formen en lagringsgräns kan ha om den
 * ska betyda något den dag någon frågar.
 *
 * Kör tidigt, när ingen bokar: gallringen skriver till samma tabell som
 * bokningsflödet läser.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: companies } = await admin.from('companies').select('id')
  if (!companies?.length) return NextResponse.json({ gallrade: 0, foretag: 0 })

  const resultat = await Promise.allSettled(
    companies.map(c => gallraForetag(admin, c.id)),
  )

  const gallrade = resultat.reduce(
    (s, r) => s + (r.status === 'fulfilled' ? r.value : 0), 0,
  )
  return NextResponse.json({ gallrade, foretag: companies.length })
}
