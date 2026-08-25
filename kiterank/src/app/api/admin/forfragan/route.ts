import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'

/*
 * Bocka av en uppgraderingsförfrågan.
 *
 * Stämpeln sätter bara att du tagit hand om den — den ändrar ingenting hos
 * Stripe. Själva uppgraderingen görs för hand när ni kommit överens om pris
 * och tid, och webhooken följer med av sig själv när abonnemanget läggs om.
 *
 * Raden raderas inte. En kund som frågat, fått nej och frågar igen ett halvår
 * senare är värd att känna igen.
 */

export async function POST(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('paket_forfragan')
    .update({ hanterad: b.ångra === true ? null : new Date().toISOString() })
    .eq('id', b.id)

  if (error) return NextResponse.json({ error: 'db', detalj: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
