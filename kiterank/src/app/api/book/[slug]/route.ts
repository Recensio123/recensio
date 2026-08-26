import { NextRequest, NextResponse } from 'next/server'
import { isClosed } from '@/lib/accountStatus'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchStaff } from '@/lib/staffQuery'
import { fetchPolicy } from '@/lib/bookingPolicy'
import { sendBookingConfirmation, sendConfirmationFor, TYSTA } from '@/lib/bookingEmail'
import { aktivMall } from '@/lib/messageTemplates'
import { hämtaKontaktsätt } from '@/lib/kontaktsatt'
import { hämtaKrav } from '@/lib/bokningskrav'
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

  /*
   * Tjänsterna, ur den enda lista som finns.
   *
   * Här stod tidigare en reserv: fanns inga bokningsbara tjänster hämtades
   * hemsidans prislista, och fanns inte den heller branschens exempelpaket. Den
   * fanns för att en bokningssida inte skulle gapa tom bredvid en sajt full av
   * priser — ett rimligt skäl med två listor, och fel så snart det bara finns
   * en. Reserven bokade in riktiga kunder på våra exempelpriser: salongen såg
   * en bokning på 650 kr för en klippning de tar 750 för, och fick veta det
   * först när kunden stod vid stolen.
   *
   * Tom lista betyder numera att salongen inte lagt upp sina tjänster. Då säger
   * bokningssidan det, och det är ett bättre besked än ett påhittat pris.
   *
   * bokningsbar filtreras här och inte i flödet: en behandling som kräver
   * konsultation ska synas i prislistan på hemsidan men inte gå att välja i
   * kalendern.
   */
  const { data: services } = await admin
    .from('services')
    .select('id, namn, beskrivning, minuter, pris_kr, pris_fran, forberedelse, max_per_dag, avbokning_timmar')
    .eq('company_id', company.id)
    .eq('aktiv', true)
    .eq('bokningsbar', true)
    .order('sort_order')

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
    /* Vilka uppgifter kunden måste lämna, färdigräknat. Formuläret ska visa
       kravet, inte härleda det — två uträkningar av samma regel är två som kan
       glida isär. */
    required:          (await hämtaKrav(admin, company.id)).krav,
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
    inga_erbjudanden,    // kryssade i formuläret: vill inte ha erbjudanden
    source_channel,      // utm_source from the page the visitor arrived on
  } = await req.json()

  const list = Array.isArray(services) ? services.filter(s => s?.name) : []
  if (!list.length || !booking_date || !start_time || !customer_name) {
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

  /* Kontaktuppgiften salongen faktiskt använder måste finnas. Vilken det är
     avgörs av hur de håller kontakt, inte av formuläret: skickar de SMS behövs
     numret, skickar de mail behövs adressen. Kontrollen görs här och inte bara
     i formuläret — en bokning kan komma från vilken klient som helst, och en
     bekräftelse utan mottagare är ett utskick som ser lyckat ut i loggen och
     aldrig når kunden. */
  const { krav } = await hämtaKrav(admin, company.id)
  if ((krav.telefon && !String(customer_phone ?? '').trim()) ||
      (krav.epost   && !String(customer_email ?? '').trim())) {
    return NextResponse.json({ error: 'missing_contact', requires: krav }, { status: 400 })
  }

  /*
   * Tjänsterna läses ur databasen, inte ur begäran.
   *
   * Här summerades tidigare namn, tid och pris rakt ur det klienten skickade.
   * En bokningssida är öppen för vem som helst, och den som får bestämma
   * priset bestämmer vad salongen får betalt: `{ name: 'Klippning',
   * duration_minutes: 5, price_sek: 1 }` var en giltig bokning.
   *
   * Klienten får säga vilka tjänster besöket gäller. Vad de heter, hur lång tid
   * de tar och vad de kostar avgör salongen.
   */
  const önskade = list
    .map((x: { id?: unknown }) => String(x?.id ?? '').trim())
    .filter(Boolean)

  const { data: valda } = önskade.length
    ? await admin.from('services')
        .select('id, namn, minuter, pris_kr, max_per_dag')
        .eq('company_id', company.id).eq('aktiv', true).eq('bokningsbar', true)
        .in('id', önskade)
    : { data: null }

  if (!valda?.length) {
    return NextResponse.json({ error: 'unknown_service' }, { status: 400 })
  }

  /* Klientens ordning, salongens uppgifter — namnet på bekräftelsen ska stå i
     den ordning kunden valde. */
  const ordnade = önskade
    .map(id => valda.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)

  /* Salongens regler hämtas här och inte längre ner: städtiden behövs redan
     när sluttiden räknas ut. */
  const policy = await fetchPolicy(admin, company.id)

  const totalDuration = ordnade.reduce((s, t) => s + Number(t.minuter ?? 0), 0)
  const totalPrice    = ordnade.reduce((s, t) => s + Number(t.pris_kr ?? 0), 0)
  const serviceName   = ordnade.map(t => t.namn as string).join(' + ')

  /*
   * Städtiden ligger i end_time men inte i service_duration_minutes.
   *
   * Kunden har bokat en klippning på 45 minuter och ska se 45 — men stolen är
   * upptagen tills den är avtorkad. Alla krockkontroller läser end_time, så
   * det är den raden som håller nästa kund ute ur städningen.
   */
  const buffert  = policy.buffer_minutes
  const end_time = addMinutes(start_time, totalDuration + buffert)

  /* Krockkontrollerna nedan måste räkna med städtiden, precis som rutnätet
     gjorde när tiden visades. Gör de inte det säljer skrivningen en tid
     visningen redan spärrat, och de två svaren skulle vara olika. */
  const upptagen = totalDuration + buffert

  /* Re-check the slot at write time — two visitors can be staring at the
   * same free 14:00, and the second one to press the button must be told
   * no rather than double-booking the chair. The same goes for the notice
   * rule: a page left open since this morning must not book 10:00 at noon. */
  const lead = leadRuleFor(booking_date, policy.lead_minutes)
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
  const common = { startMins: startM, duration: upptagen, dow, salon: hours as Availability, bookings, blocked, lead }

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
      const pick = { staff, startTime: start_time, duration: upptagen, dow, salon: hours as Availability, bookings, blocked }
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
      timeToMins(b.start_time) < startM + upptagen && timeToMins(b.end_time) > startM)
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
  /* Numret känner igen kunden när det finns; mailet när det inte gör det. En
     salong som bara använder e-post har kunder utan nummer, och en uppslagning
     på ett tomt fält hade gjort varje besök till en ny kund — och därmed
     kundhistoriken oläsbar. */
  const telefon = String(customer_phone ?? '').trim()
  const epost   = String(customer_email ?? '').trim()

  let existingCustomer: { id: string } | null = null
  if (telefon || epost) {
    const fråga = admin.from('customers').select('id').eq('company_id', company.id)
    const { data } = await (telefon ? fråga.eq('phone', telefon) : fråga.eq('email', epost)).maybeSingle()
    existingCustomer = (data as { id: string } | null) ?? null
  }

  let customer = existingCustomer
  if (existingCustomer) {
    await admin
      .from('customers')
      /* Ett nej sätts, men tas aldrig bort automatiskt. Den som tackat nej en
         gång och bokar igen utan att kryssa i rutan har inte ändrat sig — de
         har inte tänkt på saken, och tystnad är inget samtycke. */
      .update({
        name: customer_name, email: epost || null,
        sms_opt_in: sms_opt_in ?? true,
        ...(inga_erbjudanden
          ? { marknadsforing_nej: true, marknadsforing_nej_at: new Date().toISOString(), marknadsforing_nej_kalla: 'bokning' }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCustomer.id)
  } else if (telefon || epost) {
    const { data: created } = await admin
      .from('customers')
      .insert({
        company_id: company.id,
        name:       customer_name,
        phone:      telefon || null,
        email:      epost || null,
        sms_opt_in: sms_opt_in ?? true,
        marknadsforing_nej:       Boolean(inga_erbjudanden),
        marknadsforing_nej_at:    inga_erbjudanden ? new Date().toISOString() : null,
        marknadsforing_nej_kalla: inga_erbjudanden ? 'bokning' : null,
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
    service_id:               ordnade[0].id,
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
        bookingId:        bookingId ?? null,
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
        /* Kanalen bekräftelsen går på. Beskedet att förfrågan kommit fram är
           hela poängen med det här utskicket, så det går även när salongen
           slagit av själva bekräftelsen. */
        channel:          (await aktivMall(admin, company.id, 'confirmation')).kanal
                            ?? (await hämtaKontaktsätt(admin, company.id)),
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
