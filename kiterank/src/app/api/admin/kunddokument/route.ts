import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { platformAdmin } from '@/lib/admin'
import { hämtaUnderlag, underlagSomText, DOKUMENTMALLAR } from '@/lib/kunddokument'

/*
 * Skapar och sparar ett kunddokument.
 *
 * Ordningen är hela poängen: mallen först, kundens siffror sedan. Mallen bär
 * arbetssättet och är samma för alla; underlaget är förutsättningarna för just
 * den här kunden. Ett dokument som bara sammanfattar kundens statistik är
 * inget de behöver köpa — de har redan sin statistik.
 *
 * Bara plattformsadmin. Dokumentet går ut i ditt namn och kan innehålla
 * budgetförslag; det är inte något en inloggad kund ska kunna framkalla.
 */

export const maxDuration = 120

export async function POST(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({}))
  const companyId = typeof b.companyId === 'string' ? b.companyId : ''
  const mallSlug  = typeof b.mall === 'string' ? b.mall : 'annonsstrategi'
  /* Egna instruktioner för just den här körningen — det du vet om kunden som
     inte står i någon tabell. Läggs sist så att de väger tyngst. */
  const extra     = typeof b.extra === 'string' ? b.extra.trim().slice(0, 4000) : ''

  if (!companyId) return NextResponse.json({ error: 'saknar_kund' }, { status: 400 })

  const admin = createAdminClient()

  /* Mallen ur databasen, med koden som reserv om migrationen inte körts. */
  let mall = ''
  let mallTitel = ''
  try {
    const { data } = await admin
      .from('dokumentmallar').select('titel, innehall').eq('slug', mallSlug).maybeSingle()
    if (data?.innehall) { mall = data.innehall; mallTitel = data.titel }
  } catch { /* tabellen saknas ännu */ }

  if (!mall) {
    const kod = DOKUMENTMALLAR.find(m => m.slug === mallSlug)
    if (!kod) return NextResponse.json({ error: 'okand_mall' }, { status: 400 })
    mall = kod.innehall
    mallTitel = kod.titel
  }

  const underlag = await hämtaUnderlag(companyId)
  if (!underlag) return NextResponse.json({ error: 'okand_kund' }, { status: 404 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    return NextResponse.json({ error: 'ingen_nyckel' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey })

  const meddelande = [
    mall,
    '',
    '---',
    '',
    'UNDERLAG FÖR DEN HÄR KUNDEN. Alla siffror du använder ska komma härifrån.',
    '',
    underlagSomText(underlag),
    extra ? `\n---\n\nEGNA ANTECKNINGAR OM KUNDEN (väger tyngst, kommer från den som känner dem):\n${extra}` : '',
    '',
    '---',
    '',
    'Skriv dokumentet enligt mallen. Använd markdown med ## för avsnittsrubriker.',
    'Skriv ingen inledande mening om vad du tänker göra — börja direkt i dokumentet.',
  ].join('\n')

  try {
    const svar = await anthropic.messages.create({
      model:      'claude-opus-5',
      max_tokens: 4000,
      system:     'Du är en digital marknadsförare med tio års erfarenhet av lokala tjänsteföretag i Sverige. Du följer den arbetsmall du får till punkt och pricka, och du hittar aldrig på siffror som inte står i underlaget.',
      messages:   [{ role: 'user', content: meddelande }],
    })

    const text = svar.content[0]?.type === 'text' ? svar.content[0].text : ''
    if (!text.trim()) return NextResponse.json({ error: 'tomt_svar' }, { status: 502 })

    return NextResponse.json({ innehall: text, titel: mallTitel, underlag })
  } catch (e) {
    return NextResponse.json(
      { error: 'modellen', detalj: e instanceof Error ? e.message : 'okänt fel' },
      { status: 502 },
    )
  }
}

/**
 * Skickar ett sparat dokument till kunden.
 *
 * Innan det här ligger dokumentet som utkast och syns bara i admin. Efter det
 * står det i kundens panel med knappen för att godkänna planen.
 *
 * Mejlet som säger att det ligger där skickas inte än — Resend är inte
 * påkopplat. Tills det är det får du säga till kunden själv, för en rapport
 * ingen vet om är en rapport ingen läser.
 */
export async function PATCH(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json().catch(() => ({ id: '' }))
  if (!id) return NextResponse.json({ error: 'saknar_id' }, { status: 400 })

  const admin = createAdminClient()
  const nu = new Date().toISOString()
  const { error } = await admin
    .from('kunddokument')
    .update({ status: 'skickad', skickad_at: nu, uppdaterad: nu })
    .eq('id', id)
    .eq('status', 'utkast')

  if (error) return NextResponse.json({ error: 'db', detalj: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, skickad_at: nu })
}

/** Sparar ett dokument — nytt eller ändrat. */
export async function PUT(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const innehall = String(b.innehall ?? '')
  if (innehall.length > 200_000) return NextResponse.json({ error: 'for_langt' }, { status: 400 })

  try {
    if (b.id) {
      const { error } = await admin
        .from('kunddokument')
        .update({ innehall, titel: String(b.titel ?? ''), uppdaterad: new Date().toISOString() })
        .eq('id', b.id)
      if (error) throw error
      return NextResponse.json({ ok: true, id: b.id })
    }

    const { data, error } = await admin
      .from('kunddokument')
      .insert({
        company_id: b.companyId,
        mall:       String(b.mall ?? 'annonsstrategi'),
        titel:      String(b.titel ?? 'Dokument'),
        period:     b.period ? String(b.period) : null,
        innehall,
        /* Siffrorna som de såg ut när dokumentet skrevs. En rapport som inte
           går att belägga i efterhand är värdelös den dag någon ifrågasätter
           en siffra i den. */
        underlag:   b.underlag ?? null,
      })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    return NextResponse.json(
      { error: 'db', detalj: e instanceof Error ? e.message : 'okänt fel' },
      { status: 500 },
    )
  }
}
