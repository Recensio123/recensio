import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'

/*
 * Spara en avtalstext.
 *
 * Bara plattformsadmin. Texten här är vad kunderna sedan möter som villkor,
 * och det är inte en inställning någon annan ska kunna röra.
 */

export async function POST(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({}))
  const slug = typeof b.slug === 'string' ? b.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const innehall = String(b.innehall ?? '')
  /* Taket är ett skydd mot en klistrad fil, inte en gräns någon skriver sig
     till för hand — ett biträdesavtal ligger på några tiotusen tecken. */
  if (innehall.length > 200_000) {
    return NextResponse.json({ error: 'for_langt' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('avtal')
    .update({
      innehall,
      version:    String(b.version ?? '').trim() || null,
      uppdaterad: new Date().toISOString(),
    })
    .eq('slug', slug)

  if (error) return NextResponse.json({ error: 'db', detalj: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
