import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchTemplates, saveTemplate, settingsFor, TEMPLATES, type TemplateKind, type TemplatePatch } from '@/lib/messageTemplates'
import { smsConfigured, fitsOneSms, SMS_MAX } from '@/lib/smser'
import { salonPhone, svarsInfo } from '@/lib/mailParties'

/*
 * Salongens meddelandetexter.
 *
 * En rutt för alla sorter, eftersom panelen visar dem tillsammans — bekräftelse,
 * avbokning, påminnelse och recensionsförfrågan läses i ett anrop och sparas en
 * i taget.
 *
 * Sorten valideras mot listan i koden och inte mot databasen. Skickar någon en
 * påhittad sort ska den avvisas, inte skapa en rad som ingen läser.
 */

const KINDS = TEMPLATES.map(t => t.kind) as string[]

export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const rows  = await fetchTemplates(admin, access.companyId)

  /* Recensionslänken hör till samma skärm men bor på företaget — den är en
     adress salongen har, inte ett meddelande. Kolumnen kan saknas i en databas
     utan migrationen, och då är svaret null snarare än ett fel. */
  let reviewUrl: string | null = null
  const res = await admin
    .from('companies').select('review_url').eq('id', access.companyId).maybeSingle()
  if (!res.error) reviewUrl = (res.data?.review_url as string | null) ?? null

  /* Vad som läggs till vid sändning och alltså tär på de 160 tecknen, per
     meddelandesort. Panelen behöver det för att kunna räkna rätt — utan det
     mäter mätaren mallen i stället för det kunden får. */
  const extra = await smsExtra(admin, access.companyId, reviewUrl)

  /* Vilka kanaler som faktiskt kan användas. Utan SMS-nycklar ska panelen inte
     erbjuda ett val som tyst inte skickar något. */
  return NextResponse.json({
    templates: rows,
    reviewUrl,
    smsReady:  smsConfigured(),
    smsExtra:  extra,
    smsMax:    SMS_MAX,
  })
}

/*
 * Det som läggs till varje SMS vid sändning.
 *
 * Recensionsförfrågan bär länken och en kortare svarsrad utan telefonnummer —
 * ett besök som redan varit har ingen tid att flytta. De övriga bär numret.
 */
async function smsExtra(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  reviewUrl: string | null,
): Promise<Record<string, string>> {
  const phone = await salonPhone(admin, companyId)
  const bokning = svarsInfo(phone).sms
  const omdome  = svarsInfo(phone, 'omdome').sms

  return {
    confirmation: bokning,
    cancellation: bokning,
    reminder:     bokning,
    review:       [reviewUrl?.trim(), omdome].filter(Boolean).join(' '),
  }
}

const KANALER = ['email', 'sms', 'both']

export async function PUT(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json()

  /* Recensionslänken sparas genom samma rutt, eftersom den redigeras på samma
     skärm. Ingen mall inblandad. */
  if (typeof b.reviewUrl === 'string') {
    const url = b.reviewUrl.trim()
    if (url && !/^https?:\/\/\S+$/.test(url)) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin
      .from('companies').update({ review_url: url || null }).eq('id', access.companyId)
    return error
      ? NextResponse.json({ error: 'save_failed' }, { status: 500 })
      : NextResponse.json({ ok: true })
  }

  if (!KINDS.includes(String(b.kind))) {
    return NextResponse.json({ error: 'unknown_kind' }, { status: 400 })
  }

  const patch: TemplatePatch = {}

  if (b.body !== undefined) {
    if (typeof b.body !== 'string') {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
    /* Ett tak, så en text inte kan bli så lång att den bryter mailet eller
       kostar fyra SMS utan att salongen märkt det. */
    if (b.body.length > 600) {
      return NextResponse.json({ error: 'too_long' }, { status: 400 })
    }
    patch.body = b.body
  }

  if (b.channel !== undefined) {
    if (!KANALER.includes(String(b.channel))) {
      return NextResponse.json({ error: 'invalid_channel' }, { status: 400 })
    }
    patch.channel = b.channel
  }

  /* Ett SMS per utskick, alltid. Kontrollen görs mot det kunden får — mallen
     plus länken plus svarsraden — och inte mot rutans innehåll. Den gäller både
     när texten ändras och när kanalen byts till SMS med en text som redan låg
     över gränsen. */
  const admin0    = createAdminClient()
  const nuvarande = await fetchTemplates(admin0, access.companyId)
  const kanal     = patch.channel ?? settingsFor(nuvarande, b.kind as TemplateKind).channel
  const kropp     = patch.body    ?? settingsFor(nuvarande, b.kind as TemplateKind).body

  if (kanal !== 'email') {
    const { data: co } = await admin0
      .from('companies').select('review_url').eq('id', access.companyId).maybeSingle()
    const extra = await smsExtra(admin0, access.companyId, (co?.review_url as string) ?? null)
    if (!fitsOneSms(kropp, extra[b.kind as string] ?? '')) {
      return NextResponse.json({ error: 'sms_too_long', max: SMS_MAX }, { status: 400 })
    }
  }

  if (b.enabled !== undefined) patch.enabled = Boolean(b.enabled)

  if (b.lead_value !== undefined) {
    const v = Number(b.lead_value)
    /* Noll är giltigt för recensionsförfrågan — direkt efter besöket. Taket
       finns för att en påminnelse 400 timmar i förväg inte är en påminnelse. */
    if (!Number.isInteger(v) || v < 0 || v > 336) {
      return NextResponse.json({ error: 'invalid_lead' }, { status: 400 })
    }
    patch.lead_value = v
  }

  if (b.lead_unit !== undefined) {
    if (b.lead_unit !== 'h' && b.lead_unit !== 'd') {
      return NextResponse.json({ error: 'invalid_lead' }, { status: 400 })
    }
    patch.lead_unit = b.lead_unit
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'nothing_to_save' }, { status: 400 })
  }

  const admin = createAdminClient()
  const ok    = await saveTemplate(admin, access.companyId, b.kind as TemplateKind, patch)

  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'save_failed' }, { status: 500 })
}
