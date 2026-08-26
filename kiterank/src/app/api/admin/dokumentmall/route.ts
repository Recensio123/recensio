import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'

/*
 * Spara en dokumentmall.
 *
 * Mallen är arbetssättet som varje kunddokument skrivs ur. Bara plattformsadmin
 * — den styr vad som levereras till betalande kunder, och det är inte en
 * inställning någon annan ska kunna röra.
 */
export async function POST(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({}))
  const slug = typeof b.slug === 'string' ? b.slug.trim() : ''
  if (!slug) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const innehall = String(b.innehall ?? '')
  if (innehall.length > 100_000) return NextResponse.json({ error: 'for_langt' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('dokumentmallar')
    .update({ innehall, uppdaterad: new Date().toISOString() })
    .eq('slug', slug)

  if (error) return NextResponse.json({ error: 'db', detalj: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
