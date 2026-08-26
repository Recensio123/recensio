import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { currentCompany } from '@/lib/companyScope'

/*
 * Kunden godkänner planen.
 *
 * Skriver status, tidpunkt och vem som tryckte. Det sista är hela poängen:
 * ett godkännande utan namn och datum är inget godkännande den dag någon
 * frågar vad som var överenskommet om budgeten.
 *
 * Dokumentet måste tillhöra den inloggades företag. Utan den kontrollen hade
 * ett gissat id räckt för att godkänna någon annans plan — och budgetar som
 * ändras uppåt är just det man inte vill kunna göra åt främmande.
 *
 * Ett redan godkänt dokument rörs inte. Datumet ska visa när kunden faktiskt
 * sa ja, inte när de senast öppnade sidan.
 */
export async function POST(req: NextRequest) {
  const scope = await currentCompany()
  if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json().catch(() => ({ id: '' }))
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'saknar_id' }, { status: 400 })
  }

  /* Vem som tryckte. E-posten står på inloggningen, inte på företaget — en
     salong kan ha flera konton och det spelar roll vem av dem som sa ja. */
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const av = user?.email ?? 'okänd'

  try {
    const { data: dok } = await scope.admin
      .from('kunddokument')
      .select('id, company_id, status, godkand_at, godkand_av')
      .eq('id', id)
      .maybeSingle()

    if (!dok || dok.company_id !== scope.id) {
      return NextResponse.json({ error: 'hittades_inte' }, { status: 404 })
    }

    if (dok.status === 'godkand') {
      return NextResponse.json({ ok: true, av: dok.godkand_av, nar: dok.godkand_at })
    }

    const nar = new Date().toISOString()
    const { error } = await scope.admin
      .from('kunddokument')
      .update({ status: 'godkand', godkand_at: nar, godkand_av: av, uppdaterad: nar })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true, av, nar })
  } catch (e) {
    return NextResponse.json(
      { error: 'db', detalj: e instanceof Error ? e.message : 'okänt fel' },
      { status: 500 },
    )
  }
}
