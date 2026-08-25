import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveTemplate, MAX_LEDTID, TEMPLATES, type TemplateKind, type TemplatePatch, type TemplateChannel } from '@/lib/messageTemplates'
import { smsUiUnlocked, rensaAvsandare } from '@/lib/smser'
import { sparaKontaktsätt, läsKontaktsätt } from '@/lib/kontaktsatt'
import { meddelandeData } from '@/lib/meddelandenData'

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

/*
 * Allt panelen behöver, i fyra frågor.
 *
 * Det var femton innan, ställda en i taget: samma företagsrad lästes fyra
 * gånger, samma sidinnehåll tre, samma domänrad tre. Varje läsning är en
 * tur-och-retur till databasen, och femton av dem i följd är hela skillnaden
 * mellan en flik som öppnas och en flik som laddar.
 *
 * Skälet till att det blev så är att hjälpfunktionerna är bekväma —
 * `salonPhone` frågar själv, `salonOrigin` frågar själv — och varje ny rad
 * kod tog med sig ännu en fråga utan att någon såg summan. De funktionerna är
 * kvar och används där en enstaka uppgift behövs; här läses tabellerna en gång
 * var, parallellt, och resten räknas fram.
 */
/* Samma data som sidan serverrenderar. Rutten finns för omläsningen efter en
   sparning — panelen behöver inte fråga vid öppning. */
export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await meddelandeData(createAdminClient(), access.companyId))
}

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

  /* Numret kunden kan ringa. Tomt fält betyder hemsidans nummer igen. */
  if (typeof b.contactPhone === 'string') {
    const tel = b.contactPhone.trim().slice(0, 24)
    /* Något som går att ringa: siffror, och de tecken folk skriver mellan dem.
       Ingen strikt validering — svenska nummer skrivs på fem sätt och alla
       fungerar när någon slår dem. */
    if (tel && !/^[+\d][\d\s()-]{5,}$/.test(tel)) {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin
      .from('companies').update({ contact_phone: tel || null }).eq('id', access.companyId)
    return error
      ? NextResponse.json({ error: 'save_failed' }, { status: 500 })
      : NextResponse.json({ ok: true })
  }

  /* Avsändarnamnet i SMS. Salongens, och det första kunden ser — sparas här av
     samma skäl som recensionslänken: det redigeras på samma skärm. */
  if (typeof b.smsSender === 'string') {
    const rent = rensaAvsandare(b.smsSender)
    /* Tomt fält betyder att namnet härleds ur företagsnamnet igen. Ett namn
       utan en enda bokstav avvisas: operatörerna behandlar rena siffror som ett
       telefonnummer, och då blir avsändaren obegriplig. */
    if (rent && !/[A-Za-z]/.test(rent)) {
      return NextResponse.json({ error: 'invalid_sender' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin
      .from('companies').update({ sms_sender: rent || null }).eq('id', access.companyId)
    return error
      ? NextResponse.json({ error: 'save_failed' }, { status: 500 })
      : NextResponse.json({ ok: true })
  }

  /* Kontaktsättet sparas genom samma rutt av samma skäl som recensionslänken:
     det redigeras på samma skärm. Det hör till salongen och inte till en
     enskild mall. */
  if (b.channel !== undefined && b.kind === undefined) {
    if (b.channel !== 'email' && b.channel !== 'sms') {
      return NextResponse.json({ error: 'invalid_channel' }, { status: 400 })
    }
    /* SMS utan nycklar skickar ingenting. Att låta salongen välja det vore att
       göra numret obligatoriskt i bokningen för meddelanden som aldrig går. */
    if (b.channel === 'sms' && !smsUiUnlocked()) {
      return NextResponse.json({ error: 'sms_not_ready' }, { status: 400 })
    }
    const admin = createAdminClient()
    const ok    = await sparaKontaktsätt(admin, access.companyId, läsKontaktsätt(b.channel))
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  if (!KINDS.includes(String(b.kind))) {
    return NextResponse.json({ error: 'unknown_kind' }, { status: 400 })
  }

  /* Kanalen sätts inte som ett värde på raden — den pekar ut VILKEN rad som
     ändras. Den måste vara känd innan texten granskas: mailet och SMS:et har
     olika obligatoriska platshållare, eftersom mailet bär tiden i sin
     sammanställning och SMS:et inte gör det. */
  const kanal: TemplateChannel = b.channel === 'sms' ? 'sms' : 'email'
  if (b.channel !== undefined && !['email', 'sms'].includes(String(b.channel))) {
    return NextResponse.json({ error: 'invalid_channel' }, { status: 400 })
  }

  /* Texterna är låsta och ligger i koden. Salongen bestämmer om ett meddelande
     går ut och när — inte vad det säger. Ett anrop som ändå bär en text avvisas
     i stället för att tyst ignoreras: den som skickar den tror annars att den
     sparades. */
  if (b.body !== undefined || b.subject !== undefined) {
    return NextResponse.json({ error: 'text_locked' }, { status: 400 })
  }

  const patch: TemplatePatch = {}

  if (b.enabled !== undefined) patch.enabled = Boolean(b.enabled)

  if (b.lead_value !== undefined) {
    const v = Number(b.lead_value)
    /* Timmar, och högst ett dygn. Noll är giltigt för recensionsförfrågan —
       direkt efter besöket. */
    if (!Number.isInteger(v) || v < 0 || v > MAX_LEDTID) {
      return NextResponse.json({ error: 'invalid_lead' }, { status: 400 })
    }
    patch.lead_value = v
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'nothing_to_save' }, { status: 400 })
  }

  const admin = createAdminClient()
  const kind  = b.kind as TemplateKind
  const ok    = await saveTemplate(admin, access.companyId, kind, patch, kanal)

  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'save_failed' }, { status: 500 })
}
