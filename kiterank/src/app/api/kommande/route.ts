import { NextResponse } from 'next/server'
import { currentAccess } from '@/lib/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { hämtaKö } from '@/lib/kommandeServer'
import { sendTimedMessage, type TimedBooking } from '@/lib/timedMessages'
import { kanalFor } from '@/lib/messageTemplates'
import { hämtaKanalval } from '@/lib/kontaktsatt'

/*
 * Kön av utskick, omläst.
 *
 * Sidan serverrenderar listan när fliken öppnas — den här rutten finns för det
 * som händer efteråt: när salongen stoppat ett utskick och listan ska visa det
 * som faktiskt gäller. Att låta fliken hämta allt själv vid öppning hade
 * betytt en laddningsruta för data servern redan hade i handen.
 */

export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  return NextResponse.json(await hämtaKö(admin, access.companyId))
}

/*
 * Skicka nu — samma utskick som klockan skulle skickat, fast i klicket.
 *
 * Pulsen går var 15:e minut, så ett schemalagt utskick kan ligga upp till en
 * kvart efter sin tidpunkt. Oftast osynligt; men salongen som står med kunden
 * i luren, eller vill ha ut omdömesfrågan medan besöket är färskt, ska inte
 * behöva vänta på en klocka. Knappen tar exakt samma väg som pulsen —
 * sendTimedMessage, samma kanalval, samma stämpel — bara tidigare.
 *
 * Stämpeln skrivs vid lyckat skick, och det är den som gör knappen och klockan
 * omöjliga att dubblera: den som hann först vinner, den andra ser en stämplad
 * rad och rör den inte.
 */
export async function POST(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const kind = b.kind === 'reminder' ? 'reminder' as const
             : b.kind === 'review'   ? 'review'   as const
             : null
  if (!kind || typeof b.id !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const admin   = createAdminClient()
  const stämpel = kind === 'reminder' ? 'reminder_sent_at' : 'review_sent_at'

  /* Salongens eget id i villkoret — en giltig inloggning ska inte kunna skicka
     utskick åt någon annans kund. */
  const { data: rad } = await admin
    .from('bookings')
    .select(`id, company_id, customer_name, customer_email, customer_phone, service_name, booking_date, start_time, staff_id, cancel_code, status, ${stämpel}`)
    .eq('id', b.id)
    .eq('company_id', access.companyId)
    .maybeSingle()

  if (!rad) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const bokning = rad as unknown as TimedBooking & { status: string } & Record<string, string | null>

  /* Redan skickat är redan skickat — knappen och klockan delar stämpel. */
  if (bokning[stämpel]) return NextResponse.json({ error: 'already_sent' }, { status: 409 })

  /* En avbokad tid har inget att skicka, och en kund som inte kom ska inte få
     en vänlig fråga om betyg. Påminnelsen har samma spärr av samma skäl. */
  if (bokning.status === 'cancelled' || bokning.status === 'no_show') {
    return NextResponse.json({ error: 'wrong_status' }, { status: 409 })
  }

  const channel = kanalFor(kind, await hämtaKanalval(admin, access.companyId))
  const r = await sendTimedMessage(admin, bokning, kind, channel)

  if (!r.sent) {
    /* Skälet följer med så panelen kan säga något bättre än "gick inte" —
       skillnaden mellan "ingen omdömeslänk inlagd" och ett tekniskt fel är
       skillnaden mellan något salongen kan åtgärda och något vi ska. */
    return NextResponse.json({ error: 'send_failed', reason: r.reason ?? null }, { status: 502 })
  }

  await admin
    .from('bookings')
    .update({ [stämpel]: new Date().toISOString() })
    .eq('id', b.id)
    .eq('company_id', access.companyId)

  return NextResponse.json({ ok: true })
}

/* Att stänga av ett enskilt utskick för en enskild bokning. */
export async function PATCH(req: Request) {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json()
  const kolumn = b.kind === 'reminder' ? 'skip_reminder' : b.kind === 'review' ? 'skip_review' : null

  /* Bekräftelsen går inte att stänga av per bokning. Kunden som just bokat ska
     få veta att det gick igenom — det är hela beskedets syfte. */
  if (!kolumn || typeof b.id !== 'string') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const admin = createAdminClient()
  /* Salongens eget id i villkoret, inte bara bokningens: annars kan en giltig
     inloggning stänga av utskick för någon annans kund. */
  const { error } = await admin
    .from('bookings')
    .update({ [kolumn]: Boolean(b.över) })
    .eq('id', b.id)
    .eq('company_id', access.companyId)

  return error
    ? NextResponse.json({ error: 'save_failed' }, { status: 500 })
    : NextResponse.json({ ok: true })
}
