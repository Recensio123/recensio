import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'
import { clearSiteEverywhere } from '@/app/s/[slug]/site-data'

/*
 * Salongens tjänster.
 *
 * Rutten fanns inte förut, och det var hela problemet: bokningstjänsterna
 * skrevs vid registreringen och gick sedan aldrig att ändra. Prislistan på
 * hemsidan gick att ändra. Så snart kunden höjde ett pris menade de två
 * listorna olika saker om samma behandling.
 *
 * Bara salongens ägare. Priser är inte något en receptionist ska kunna flytta,
 * och en frisör med eget konto ska inte kunna ändra vad kollegan tar betalt.
 *
 * Varje skrivning rensar sajtens cache. Prislistan på hemsidan ritas ur de här
 * raderna nu, och en cache som inte får veta att de ändrats visar gamla priser
 * i upp till ett dygn — vilket är exakt det fel vi just tagit bort.
 */

const MAX_RADER = 200

type Kropp = Record<string, unknown>

const text = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

const heltal = (v: unknown, min: number, max: number): number | null => {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.round(n)))
}

const flagga = (v: unknown, standard: boolean): boolean =>
  typeof v === 'boolean' ? v : standard

/** Fälten en tjänst får sätta, tvättade. Allt annat i kroppen ignoreras. */
function fält(b: Kropp, nytt: boolean) {
  const ut: Record<string, unknown> = {}

  if (nytt || 'namn'        in b) ut.namn        = text(b.namn, 120)
  if (nytt || 'kategori'    in b) ut.kategori    = text(b.kategori, 60) || 'Tjänster'
  if (nytt || 'beskrivning' in b) ut.beskrivning = text(b.beskrivning, 400)
  if (nytt || 'forberedelse' in b) ut.forberedelse = text(b.forberedelse, 300)

  /* Null är ett svar här och inte ett saknat värde: pris på förfrågan. Det
     skiljer sig från noll, som betyder gratis. */
  if (nytt || 'pris_kr' in b) {
    ut.pris_kr = b.pris_kr === null || b.pris_kr === '' ? null : heltal(b.pris_kr, 0, 1_000_000)
  }
  if (nytt || 'max_per_dag' in b) {
    ut.max_per_dag = b.max_per_dag === null || b.max_per_dag === '' ? null : heltal(b.max_per_dag, 1, 100)
  }
  if (nytt || 'avbokning_timmar' in b) {
    ut.avbokning_timmar = b.avbokning_timmar === null || b.avbokning_timmar === ''
      ? null : heltal(b.avbokning_timmar, 0, 336)
  }

  /* Fem minuter är kortaste tid någon kan boka. Under det är det inte en
     behandling utan ett skrivfel som spärrar en stol. */
  if (nytt || 'minuter'         in b) ut.minuter         = heltal(b.minuter, 5, 600) ?? 60
  if (nytt || 'sort_order'      in b) ut.sort_order      = heltal(b.sort_order, 0, 9999) ?? 0

  if (nytt || 'pris_fran'   in b) ut.pris_fran   = flagga(b.pris_fran, false)
  if (nytt || 'visa_pris'   in b) ut.visa_pris   = flagga(b.visa_pris, true)
  if (nytt || 'visa_tid'    in b) ut.visa_tid    = flagga(b.visa_tid, true)
  if (nytt || 'bokningsbar' in b) ut.bokningsbar = flagga(b.bokningsbar, true)
  if (nytt || 'aktiv'       in b) ut.aktiv       = flagga(b.aktiv, true)

  return ut
}

const KOLUMNER = 'id, kategori, namn, beskrivning, pris_kr, pris_fran, visa_pris, minuter, visa_tid, bokningsbar, max_per_dag, avbokning_timmar, forberedelse, aktiv, sort_order'

export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: rader } = await admin
    .from('services').select(KOLUMNER).eq('company_id', access.companyId).order('sort_order')

  /* Kopplingarna i en andra fråga, begränsad till salongens egna tjänste-id:n.
     service_staff har inget company_id att filtrera på — den ärver sin
     tillhörighet av tjänsten, och därför måste id:na hämtas först. */
  const ids = (rader ?? []).map(r => (r as unknown as { id: string }).id)
  const { data: personal } = ids.length
    ? await admin.from('service_staff').select('service_id, staff_id').in('service_id', ids)
    : { data: [] }

  return NextResponse.json({ tjanster: rader ?? [], personal: personal ?? [] })
}

export async function POST(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as Kropp
  const nytt = fält(b, true)
  if (!nytt.namn) return NextResponse.json({ error: 'Tjänsten behöver ett namn' }, { status: 400 })

  const admin = createAdminClient()

  /* Ett tak, för att en trasig klient inte ska kunna fylla tabellen. Ingen
     salong har tvåhundra behandlingar; den som tror det har en kategori som
     borde vara ett fält. */
  const { count } = await admin.from('services')
    .select('*', { count: 'exact', head: true }).eq('company_id', access!.companyId)
  if ((count ?? 0) >= MAX_RADER) {
    return NextResponse.json({ error: `Högst ${MAX_RADER} tjänster` }, { status: 400 })
  }

  const { data, error } = await admin.from('services')
    .insert({ ...nytt, company_id: access!.companyId })
    .select(KOLUMNER).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await clearSiteEverywhere(access!.companyId)
  return NextResponse.json({ tjanst: data })
}

export async function PATCH(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as Kropp
  const admin = createAdminClient()

  /*
   * Byta namn på en hel kategori.
   *
   * Rubriken är inget eget objekt i databasen utan ett fält på varje tjänst, så
   * ett namnbyte rör alla rader i gruppen. Det sker i en fråga och inte i ett
   * anrop per rad: femton anrop för att rätta ett stavfel är femton chanser att
   * halva listan byter namn och andra halvan inte.
   */
  if (b.kategoriByt && typeof b.kategoriByt === 'object') {
    const { från, till } = b.kategoriByt as Record<string, unknown>
    const gammal = text(från, 60)
    const ny     = text(till, 60)
    if (!gammal || !ny) return NextResponse.json({ error: 'Kategorin behöver ett namn' }, { status: 400 })

    const { error } = await admin.from('services')
      .update({ kategori: ny })
      .eq('company_id', access!.companyId)
      .eq('kategori', gammal)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await clearSiteEverywhere(access!.companyId)
    return NextResponse.json({ ok: true })
  }

  const id = text(b.id, 60)
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const patch = fält(b, false)

  if (Object.keys(patch).length) {
    /* company_id i villkoret och inte bara id: en tjänst tillhör en salong, och
       ett id som råkar finnas hos någon annan ska inte gå att skriva till. */
    const { error } = await admin.from('services')
      .update(patch).eq('id', id).eq('company_id', access!.companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  /* Vem som kan utföra tjänsten. Tom lista betyder alla — inte ingen — så en
     salong som aldrig rör inställningen fungerar som förut. */
  if (Array.isArray(b.personal)) {
    const { data: min } = await admin.from('services')
      .select('id').eq('id', id).eq('company_id', access!.companyId).maybeSingle()
    if (!min) return NextResponse.json({ error: 'Tjänsten finns inte' }, { status: 404 })

    const önskade = (b.personal as unknown[]).map(v => text(v, 60)).filter(Boolean)
    const { data: stolar } = await admin.from('staff')
      .select('id').eq('company_id', access!.companyId).in('id', önskade.length ? önskade : ['—'])
    const giltiga = (stolar ?? []).map(s => s.id as string)

    await admin.from('service_staff').delete().eq('service_id', id)
    if (giltiga.length) {
      await admin.from('service_staff').insert(giltiga.map(staff_id => ({ service_id: id, staff_id })))
    }
  }

  await clearSiteEverywhere(access!.companyId)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? ''
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  /*
   * En tjänst som använts i en bokning tas inte bort.
   *
   * Bokningen bär sin egen kopia av namn och pris, så historiken överlever —
   * men kopplingen tillbaka gör det inte, och den är vad kundhistoriken följer.
   * Den görs osynlig i stället: borta ur prislistan, borta ur bokningsflödet,
   * kvar för de bokningar som redan pekar på den.
   */
  const { count } = await admin.from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', access!.companyId).eq('service_id', id)

  const { error } = (count ?? 0) > 0
    ? await admin.from('services').update({ aktiv: false }).eq('id', id).eq('company_id', access!.companyId)
    : await admin.from('services').delete().eq('id', id).eq('company_id', access!.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await clearSiteEverywhere(access!.companyId)
  return NextResponse.json({ ok: true, doldes: (count ?? 0) > 0 })
}
