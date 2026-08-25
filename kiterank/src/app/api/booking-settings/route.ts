import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentAccess, canManageSalon } from '@/lib/access'
import { fetchPolicy } from '@/lib/bookingPolicy'
import { hämtaKrav } from '@/lib/bokningskrav'

/* The salon's booking policy: how late a customer may cancel, how close to
 * the hour they may book, whether a free slot confirms itself, and what the
 * confirmation says. Any single chair may override the middle two — that
 * lives on the staff row, under /api/staff. */

export async function GET() {
  const access = await currentAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  /* Kravet på kunduppgifter hör hit: det är en bokningsregel som salongen
     sätter, även om kanalvalet sätter dess golv. */
  const [policy, krav] = await Promise.all([
    fetchPolicy(admin, access.companyId),
    hämtaKrav(admin, access.companyId),
  ])
  return NextResponse.json({
    ...policy,
    contact_channel: krav.kanal,
    required:        krav.krav,
  })
}

/* The policy applies to the whole salon, so only the salon changes it. */
export async function PATCH(req: NextRequest) {
  const access = await currentAccess()
  if (!canManageSalon(access)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = access!.companyId
  const body = await req.json()

  const fields: Record<string, unknown> = {}

  if ('cancel_hours' in body) {
    const hours = Number(body.cancel_hours)
    if (!Number.isFinite(hours) || hours < 0 || hours > 168) {
      return NextResponse.json({ error: 'Ogiltigt värde' }, { status: 400 })
    }
    fields.booking_cancel_hours = hours
  }

  if ('lead_minutes' in body) {
    const mins = Number(body.lead_minutes)
    // Up to a week's notice — beyond that the salon is not taking bookings
    if (!Number.isFinite(mins) || mins < 0 || mins > 10080) {
      return NextResponse.json({ error: 'Ogiltigt värde' }, { status: 400 })
    }
    fields.booking_lead_minutes = Math.round(mins)
  }

  if ('auto_confirm' in body) {
    fields.booking_auto_confirm = Boolean(body.auto_confirm)
  }

  /* Marginalen innan ett besök stängs, och gränsen för när en sen bokning
     slipper påminnelse. Båda i timmar, båda med samma tak — ett dygn är så
     långt någon av dem är meningsfull, och taket hindrar ett skrivfel från
     att stänga av regeln i praktiken. */
  for (const [namn, kolumn] of [
    ['auto_complete_hours', 'booking_auto_complete_hours'],
    ['reminder_skip_hours', 'booking_reminder_skip_hours'],
  ] as const) {
    if (!(namn in body)) continue
    const timmar = Number(body[namn])
    if (!Number.isFinite(timmar) || timmar < 0 || timmar > 24) {
      return NextResponse.json({ error: 'Ogiltigt värde' }, { status: 400 })
    }
    fields[kolumn] = Math.round(timmar)
  }

  /* Städtiden. Taket på två timmar är inte en gräns någon når — det är för att
     ett skrivfel i fältet inte ska kunna tömma en hel dag i kalendern. */
  if ('buffer_minutes' in body) {
    const mins = Number(body.buffer_minutes)
    if (!Number.isFinite(mins) || mins < 0 || mins > 120) {
      return NextResponse.json({ error: 'Ogiltigt värde' }, { status: 400 })
    }
    fields.booking_buffer_minutes = Math.round(mins)
  }


  if ('confirmation_text' in body) {
    const text = String(body.confirmation_text ?? '').trim()
    /* Capped at SMS-friendly length: this text becomes the confirmation
     * message when sendouts connect, and 320 chars is two SMS segments. */
    if (text.length > 320) {
      return NextResponse.json({ error: 'Max 320 tecken' }, { status: 400 })
    }
    fields.booking_confirmation_text = text || null   // empty = standard
  }

  if (!Object.keys(fields).length) {
    return NextResponse.json({ error: 'Inget att spara' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('companies').update(fields).eq('id', companyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
