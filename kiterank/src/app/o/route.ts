import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/*
 * Omdömeslänken utan slug, för salonger med egen domän.
 *
 * På klipphuset.se säger domänen redan vilken salong det gäller, så vägen
 * behöver ingenting mer. Tjugo tecken kortare än formen med slug, i ett
 * meddelande där tjugo tecken kan vara skillnaden mellan ett SMS och två.
 *
 * Vilken salong det är läses ur värdnamnet. Ligger adressen på vår egen domän
 * går det inte — då finns ingen salong i värdnamnet — och därför svarar den
 * formen bara på verifierade kunddomäner. Övriga använder /o/[slug].
 */

export async function GET(req: NextRequest) {
  const värd = req.headers.get('host')?.replace(/:\d+$/, '').replace(/^www\./, '')
  const hem = () => NextResponse.redirect(new URL('/', req.url))
  if (!värd) return hem()

  const admin = createAdminClient()

  const { data: dom } = await admin
    .from('custom_domains')
    .select('company_id')
    .eq('domain', värd)
    .not('verified_at', 'is', null)
    .maybeSingle()

  if (!dom?.company_id) return hem()

  const { data } = await admin
    .from('companies')
    .select('review_url')
    .eq('id', dom.company_id)
    .maybeSingle()

  const url = (data?.review_url as string | null)?.trim()
  if (!url || !/^https?:\/\/\S+$/.test(url)) return hem()

  return NextResponse.redirect(url)
}
