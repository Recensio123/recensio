import { NextRequest, NextResponse } from 'next/server'
import { isClosed } from '@/lib/accountStatus'
import { createAdminClient } from '@/lib/supabase/admin'
import { bookingSeedsFrom, bookingServices } from '@/lib/trades'
import { fetchStaff } from '@/lib/staffQuery'
import { fetchPolicy } from '@/lib/bookingPolicy'
import { sendBookingConfirmation, sendConfirmationFor, TYSTA } from '@/lib/bookingEmail'
import { templateSettings } from '@/lib/messageTemplates'
import {
  addMinutes, assignStaff, staffFree, timeToMins, defaultAvailability,
  autoConfirmFor, leadFor, leadRuleFor, salonNow, tooSoon,
  type StaffRow, type BookingRow, type BlockedRow, type Availability,
} from '@/lib/bookingSlots'

type Params = { params: Promise<{ slug: string }> }

function shortRef(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

// GET /api/book/[slug] — company info, active services and bookable staff
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: company, error } = await admin
    .from('companies')
    .select('id, name, slug, industry')
    .eq('slug', slug)
    .single()

  if (error || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }
  /* Uppsagt avtal: inga nya bokningar. En salong som slutat hos oss ska inte
     ta emot tider ingen bevakar — det är sämre för kunden som bokar än att
     sidan är borta. Avbokning ligger i en egen route och påverkas inte, så
     den som redan har en tid inte blir strandsatt. */
  if (await isClosed(admin, company.id)) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  /* The salon's own rules, so the flow shows exactly what it decided. */
  const policy = await fetchPolicy(admin, company.id)

  let { data: services } = await admin
    .from('booking_services')
    .select('id, name, description, duration_minutes, price_sek')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('sort_order')

  /* No bookable services configured — the salon's price list is the truth,
   * so it steps in: first the list they edited on their website, then their
   * trade's example list. A booking page must never stand empty next to a
   * site full of prices. */
  if (!services?.length) {
    const { data: cfg } = await admin
      .from('site_config')
      .select('content')
      .eq('company_id', company.id)
      .maybeSingle()
    const cats = (cfg?.content as { menuCategories?: { items: { name: string; desc?: string; duration?: string; price?: string }[] }[] } | null)?.menuCategories
    const seeds = cats?.length ? bookingSeedsFrom(cats) : bookingServices(company.industry)
    services = seeds.map((s, i) => ({
      id: `pris-${i}`, name: s.name, description: s.description,
      duration_minutes: s.duration_minutes, price_sek: s.price_sek,
    }))
  }

  // Staff is a later migration — an older database just has none, and the
  // flow then skips the person step on its own.
  const staffRows = await fetchStaff(admin, company.id)
  const staff = (staffRows ?? []).map(s => ({ id: s.id, name: s.name, title: s.title, image: s.image }))

  return NextResponse.json({
    company:           { name: company.name, slug: company.slug },
    services:          services ?? [],
    staff,
    cancel_hours:      policy.cancel_hours,
    confirmation_text: policy.confirmation_text,
  })
}

// POST /api/book/[slug] — create a booking + upsert customer
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = createAdminClient()

  const {
    services,            // [{ id, name, duration_minutes, price_sek }] — one or more in the same visit
    staff_id,            // chosen member, or null for no preference
    booking_date,
    start_time,
    customer_name,
    customer_phone,
    customer_email,
    customer_note,
    sms_opt_in,
    source_channel,      // utm_source from the page the visitor arrived on
  } = await req.json()

  const list = Array.isArray(services) ? services.filter(s => s?.name) : []
  if (!list.length || !booking_date || !start_time || !customer_name || !customer_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  /* Namnet följer med: det står som avsändare på bekräftelsen, så kunden ser
     salongen i inkorgen och inte oss. */
  const { data: company, error: companyErr } = await admin
    .from('companies')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (companyErr || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }
  /* Uppsagt avtal: inga nya bokningar. En salong som slutat hos oss ska inte
     ta emot tider ingen bevakar — det är sämre för kunden som bokar än att
     sidan är borta. Avbokning ligger i en egen route och påverkas inte, så
     den som redan har en tid inte blir strandsatt. */
  if (await isClosed(admin, company.id)) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  /* One visit, one row: the services combine into a single appointment whose
   * length is their sum. "Klippning + skägg" is one slot in the calendar,
   * not two bookings the salon has to piece together. */
  const totalDuration = list.reduce((s: number, x: { duration_minutes?: number }) => s + Number(x.duration_minutes ?? 0), 0)
  const totalPrice    = list.reduce((s: number, x: { price_sek?: number | null }) => s + Number(x.price_sek ?? 0), 0)
  const serviceName   = list.map((x: { name: string }) => x.name).join(' + ')
  const end_time      = addMinutes(start_time, totalDuration)

  /* Re-check the slot at write time — two visitors can be staring at the
   * same free 14:00, and the second one to press the button must be told
   * no rather than double-booking the chair. The same goes for the notice
   * rule: a page left open since this morning must not book 10:00 at noon. */
  const policy = await fetchPolicy(admin, company.id)
  const lead   = leadRuleFor(booking_date, policy.lead_minutes)
  const TOO_SOON = 'Den tiden ligger för nära inpå. Välj en senare tid, eller ring salongen.'

  if (booking_date < salonNow().date) {
    return NextResponse.json({ error: TOO_SOON }, { status: 409 })
  }

  const dow = new Date(booking_date + 'T12:00:00').getDay()
  const { data: avail } = await admin
    .from('booking_availability')
    .select('open_time, close_time, slot_duration_minutes, is_active')
    .eq('company_id', company.id)
    .eq('day_of_week', dow)
    .single()

  const hours = avail ?? defaultAvailability(dow)
  if (!hours.is_active) {
    return NextResponse.json({ error: 'Stängt den dagen' }, { status: 409 })
  }

  const { data: existing } = await admin
    .from('bookings')
    .select('staff_id, start_time, end_time')
    .eq('company_id', company.id)
    .eq('booking_date', booking_date)
    .neq('status', 'cancelled')

  let staff: StaffRow[] = []
  let blocked: BlockedRow[] = []
  let hasStaffTables = false
  try {
    const rows = await fetchStaff(admin, company.id)
    if (rows) {
      hasStaffTables = true
      staff = rows as StaffRow[]
      const { data: bl } = await admin
        .from('blocked_times')
        .select('staff_id, start_time, end_time')
        .eq('company_id', company.id)
        .lte('date_from', booking_date)
        .gte('date_to', booking_date)
      blocked = (bl ?? []) as BlockedRow[]
    }
  } catch { /* pre-migration database */ }

  const bookings = (existing ?? []) as BookingRow[]
  let assigned: StaffRow | null = null

  const startM = timeToMins(start_time)
  const common = { startMins: startM, duration: totalDuration, dow, salon: hours as Availability, bookings, blocked, lead }

  if (staff.length > 0) {
    if (staff_id) {
      const chosen = staff.find(s => s.id === staff_id)
      if (!chosen) {
        return NextResponse.json({ error: 'Tiden är inte längre ledig' }, { status: 409 })
      }
      /* Split the two refusals apart: "she cannot take you that soon" is a
       * different thing to tell a customer than "that hour is taken". */
      if (tooSoon(startM, lead, leadFor(chosen, policy.lead_minutes))) {
        return NextResponse.json({ error: TOO_SOON }, { status: 409 })
      }
      if (!staffFree({ staff: chosen, ...common })) {
        return NextResponse.json({ error: 'Tiden är inte längre ledig' }, { status: 409 })
      }
      assigned = chosen
    } else {
      const pick = { staff, startTime: start_time, duration: totalDuration, dow, salon: hours as Availability, bookings, blocked }
      assigned = assignStaff({ ...pick, lead })
      if (!assigned) {
        // Would anyone have been free if the notice rule were lifted?
        const wouldFit = assignStaff(pick)
        return NextResponse.json(
          { error: wouldFit ? TOO_SOON : 'Tiden är inte längre ledig' }, { status: 409 })
      }
    }
  } else {
    if (tooSoon(startM, lead, policy.lead_minutes)) {
      return NextResponse.json({ error: TOO_SOON }, { status: 409 })
    }
    const taken = bookings.some(b =>
      timeToMins(b.start_time) < startM + totalDuration && timeToMins(b.end_time) > startM)
    if (taken) {
      return NextResponse.json({ error: 'Tiden är inte längre ledig' }, { status: 409 })
    }
  }

  /* Free slot, inside working hours: the salon decides whether that is
   * enough. Auto means the customer leaves with a confirmed time; manual
   * means the chair sees the request first and the confirmation follows. */
  const autoConfirm = autoConfirmFor(assigned, policy.auto_confirm)

  /* The customer register, one row per phone number. Not an upsert: the
   * unique index on (company_id, phone) is partial (WHERE phone IS NOT NULL)
   * and ON CONFLICT cannot target it — the upsert failed silently on every
   * booking and no customer was ever registered. Select-then-write instead. */
  const { data: existingCustomer } = await admin
    .from('customers')
    .select('id')
    .eq('company_id', company.id)
    .eq('phone', customer_phone)
    .maybeSingle()

  let customer = existingCustomer
  if (existingCustomer) {
    await admin
      .from('customers')
      .update({ name: customer_name, email: customer_email || null, sms_opt_in: sms_opt_in ?? true, updated_at: new Date().toISOString() })
      .eq('id', existingCustomer.id)
  } else {
    const { data: created } = await admin
      .from('customers')
      .insert({
        company_id: company.id,
        name:       customer_name,
        phone:      customer_phone,
        email:      customer_email || null,
        sms_opt_in: sms_opt_in ?? true,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    customer = created
  }

  const reference = shortRef()
  const base = {
    company_id:               company.id,
    customer_id:              customer?.id ?? null,
    service_id:               /^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(list[0]?.id ?? '') ? list[0].id : null,
    service_name:             serviceName,
    service_duration_minutes: totalDuration,
    service_price_sek:        totalPrice || null,
    booking_date,
    start_time,
    end_time,
    customer_name,
    customer_phone,
    customer_email:           customer_email || null,
    customer_note:            customer_note  || null,
    source:                   'online',
    status:                   autoConfirm ? 'confirmed' : 'pending',
  }

  /* The staff columns are the newer migration. Insert with them first; a
   * pre-migration database rejects the unknown columns and gets the row it
   * still understands. */
  let cancelToken: string | null = null
  /* Radens id, så bekräftelsen kan hämta bokningen och stämpla den. Null i en
     databas som svarade utan det — mailet går ändå, bara utan stämpel. */
  let bookingId:   string | null = null
  if (hasStaffTables) {
    const withStaff = {
      ...base,
      staff_id:       assigned?.id ?? null,
      booking_ref:    reference,
      source_channel: source_channel || null,
    }
    /* Whether the name on the booking was the customer's choice or ours. The
     * column is a later migration, so fall back to the row without it. */
    let row = await admin
      .from('bookings')
      .insert({ ...withStaff, staff_requested: Boolean(staff_id) })
      .select('id, cancel_token')
      .single()
    if (row.error) {
      row = await admin.from('bookings').insert(withStaff).select('id, cancel_token').single()
    }
    if (row.error) return NextResponse.json({ error: row.error.message }, { status: 500 })
    cancelToken = row.data?.cancel_token ?? null
    bookingId   = row.data?.id ?? null
  } else {
    const { data: plain, error: err } = await admin
      .from('bookings').insert(base).select('id').single()
    if (err) return NextResponse.json({ error: err.message }, { status: 500 })
    bookingId = plain?.id ?? null
  }

  const cancelPath = cancelToken ? `/book/${slug}/avboka/${cancelToken}` : null

  /* Mailet till kunden. Bokningen är redan skriven, så ett mail som inte går
     fram får inte göra svaret till ett fel — kunden har sin tid oavsett.
     Utfallet loggas i stället, så ett tyst borttappat mail går att hitta.

     Vilket mail beror på salongens inställning för godkännande, men bara här:
     godkänns tiden direkt är det bekräftelsen, och den stämplas så att ett
     senare tryck på bekräfta inte skickar en andra. Väntar tiden på godkännande
     får kunden veta det, och bekräftelsen kommer när salongen godkänt. */
  const mail = base.status === 'confirmed' && bookingId
    ? await sendConfirmationFor(admin, bookingId)
    : await sendBookingConfirmation(admin, {
        companyId:        company.id,
        companyName:      company.name || 'Din salong',
        customerName:     customer_name,
        customerEmail:    customer_email || null,
        serviceName:      serviceName,
        bookingDate:      booking_date,
        startTime:        start_time,
        staffName:        assigned?.name ?? null,
        reference,
        cancelPath,
        status:           base.status as 'confirmed' | 'pending',
        confirmationText: policy.confirmation_text ?? null,
        /* Beskedet om en väntande tid går på samma kanal som bekräftelsen — det
           är samma sorts meddelande i kundens ögon. Samtycket kommer ur
           kryssrutan de just fyllde i, inte ur kundregistret: raden kan ha
           skapats i samma anrop. */
        customerPhone:    customer_phone || null,
        smsOptIn:         sms_opt_in ?? true,
        channel:          (await templateSettings(admin, company.id, 'confirmation')).channel,
      })

  /* Tystade skäl är inte fel: kunden lämnade ingen adress, eller utskicken är
     inte påslagna ännu. Att logga dem vid varje bokning hade dränkt de
     verkliga felen under bygget. */
  if (!mail.sent && mail.reason && !TYSTA.includes(mail.reason)) {
    console.error(`[bokning ${reference}] bekräftelsen gick inte fram: ${mail.reason}`)
  }

  return NextResponse.json({
    ok:         true,
    reference,
    staff_name: assigned?.name ?? null,
    status:     base.status,
    cancel_url: cancelPath,
  })
}
