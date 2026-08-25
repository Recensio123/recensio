import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { TONER, läsAntal, type Svar, type Underlag, type Ton } from '@/lib/textfyllare'
import { skrivTexter, fyllareRedo } from '@/lib/textfyllareServer'

/*
 * Textfyllaren.
 *
 * Nyckeln ligger på servern och lämnar den aldrig. Kunden skickar sina fyra
 * svar; underlaget — företagsnamn, ort, bransch, tjänster, öppettider — läser
 * rutten själv ur databasen i stället för att ta emot det från webbläsaren.
 * Skälet är inte bekvämlighet utan att en klient som får bestämma underlaget
 * också kan bestämma vad texten påstår om salongen.
 *
 * Svaret sparas inte. Det går tillbaka som ett förslag, och panelen låter
 * kunden ta emot fält för fält. Att skriva direkt till sajten hade betytt att
 * ett knapptryck ändrade en publicerad sida utan att någon läst resultatet.
 */

export const maxDuration = 60

function läsTon(rå: unknown): Ton {
  return TONER.some(t => t.id === rå) ? (rå as Ton) : 'varm'
}

export async function POST(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!fyllareRedo()) {
    return NextResponse.json({ error: 'Textfyllaren är inte uppsatt ännu.' }, { status: 503 })
  }

  const b = await req.json().catch(() => ({}))

  const svar: Svar = {
    plats:    String(b?.plats    ?? '').trim().slice(0, 80),
    målgrupp: String(b?.målgrupp ?? '').trim().slice(0, 300),
    viktigast:  String(b?.viktigast  ?? '').trim().slice(0, 300),
    annorlunda: String(b?.annorlunda ?? '').trim().slice(0, 400),
    ton:      läsTon(b?.ton),
    antal:    String(b?.antal ?? '').trim().slice(0, 20),
  }

  /* Alla tre krävs. Målgrupp och styrka bär texten — utan dem blir resultatet
     mallens ord igen, och knappen en rundtur som slutar där den började.
     Antalet avgör om texten skrivs i jag- eller vi-form, och en text som
     gissar där låter som någon annans oavsett hur bra den är i övrigt. */
  if (!svar.plats || !svar.målgrupp || !svar.viktigast || !svar.annorlunda || !läsAntal(svar.antal)) {
    return NextResponse.json({ error: 'Svara på alla frågorna först.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const id    = access.companyId

  const [co, site, tjänster] = await Promise.all([
    admin.from('companies').select('name, industry, city').eq('id', id).maybeSingle(),
    admin.from('site_config').select('content').eq('company_id', id).maybeSingle(),
    admin.from('services').select('namn').eq('company_id', id).eq('aktiv', true).limit(20),
  ])

  const innehåll = (site.data?.content ?? {}) as {
    businessName?: string; address?: string; hours?: string
    services?: { name?: string }[]; menuCategories?: { services?: { name?: string }[] }[]
  }

  /* Tjänsterna tas där de finns. Bokningssystemet är den sannaste källan när
     det används; annars prislistan på sajten. Priserna följer aldrig med. */
  const urPrislista = [
    ...(innehåll.services ?? []).map(s => s?.name),
    ...(innehåll.menuCategories ?? []).flatMap(k => (k?.services ?? []).map(s => s?.name)),
  ]
  const namn = (tjänster.data?.length ? tjänster.data.map(t => t.namn as string) : urPrislista)
    .map(n => String(n ?? '').trim())
    .filter(Boolean)

  const underlag: Underlag = {
    företag:    innehåll.businessName?.trim() || String(co.data?.name ?? ''),
    /* Salongens eget svar går före det vi räknat fram. Adressen i registret är
       en gatuadress; frågan gäller vilken plats de vill synas på. */
    ort:        svar.plats || String(co.data?.city ?? '') || innehåll.address?.trim() || '',
    bransch:    String(co.data?.industry ?? ''),
    tjänster:   [...new Set(namn)].slice(0, 20),
    öppettider: innehåll.hours?.trim() ?? '',
  }

  try {
    return NextResponse.json({ förslag: await skrivTexter(underlag, svar) })
  } catch (err) {
    /* Meddelandet visas för kunden, så det får inte vara ett stacktrace. */
    const text = err instanceof Error ? err.message : 'Något gick fel.'
    console.error('[textfyllare]', err)
    return NextResponse.json({ error: text }, { status: 502 })
  }
}
