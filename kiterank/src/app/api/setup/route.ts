import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSiteDraft } from '@/lib/siteTemplates'
import { ledigAdress } from '@/lib/siteAddress'
import { sparaOnboarding, type Vilja } from '@/lib/onboarding'

// Default availability: Mon–Sat 09:00–18:00, Sundays closed
const DEFAULT_AVAILABILITY = [1,2,3,4,5,6].map(day => ({
  day_of_week:           day,
  open_time:             '09:00:00',
  close_time:            '18:00:00',
  slot_duration_minutes: 30,
  is_active:             true,
})).concat([{
  day_of_week:           0,
  open_time:             '09:00:00',
  close_time:            '18:00:00',
  slot_duration_minutes: 30,
  is_active:             false,
}])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { industry, template, features, language, bizName, about, care,
          vill, harSajt, epost, telefon, brief, valtPaket } = await req.json()

  if (!bizName?.trim()) {
    return NextResponse.json({ error: 'Missing bizName' }, { status: 400 })
  }

  /* Vad kunden valt, i den form servern sedan läser. Förvalet är hemsida och
     bokning, så en anropare som inte skickar något beter sig som förut. */
  const valt: Vilja = {
    sajt:    vill?.sajt    !== false,
    bokning: vill?.bokning !== false,
  }

  /* Six answers in, a whole site out: headline, about text, process, FAQ,
   * price list, six articles and a team, with their own words and town woven
   * through. See lib/siteTemplates. */
  const seeded: Record<string, unknown> = {
    ...buildSiteDraft(about, industry, bizName),
    /*
     * Kontaktuppgifterna hamnar inte på sidan.
     *
     * Det vi frågar efter i registreringen är hur *vi* når kunden — dit
     * fakturan och driftbeskeden går. Vilken adress och vilket nummer som ska
     * stå publikt på deras hemsida är en annan fråga med ett annat svar: en
     * salong har ofta en bokningstelefon som skiljer sig från ägarens, och en
     * info-adress som inte är den personliga.
     *
     * Att fylla i den publika kontaktsektionen med våra kontaktuppgifter vore
     * att publicera något de aldrig bett om. De sätts i webbplatspanelen, där
     * kunden ser vad som visas.
     */
    // Everything on from the start — trimming down happens in the editor,
    // with the real site in front of the customer
    siteFeatures: { booking: valt.bokning, pricelist: true, gallery: true, contact: true, blog: true, reviews: true, about: true },
  }

  const admin = createAdminClient()
  /* Adressen bestäms här, inte av det som skickas in. Servern är det enda
     stället som kan avgöra vad som är ledigt, och den enda som kan göra
     det utan att två samtidiga registreringar tar samma. Regeln står i
     lib/siteAddress. */
  const slug = await ledigAdress(admin, bizName, about?.area)

  // Check if user already has a company (retry after partial failure)
  const { data: existingCompany } = await admin
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  let company: { id: string } | null = existingCompany

  if (!existingCompany) {
    /* Ingen kollisionskontroll här längre — ledigAdress har redan valt en
       ledig adress. En andra kontroll som säger nej hade bara kunnat säga nej
       till något den första just godkänt. */

    const { data: newCompany, error: companyErr } = await admin
      .from('companies')
      .insert({
        user_id:    user.id,
        name:       bizName.trim(),
        slug:       slug.trim(),
        industry,
        updated_at: new Date().toISOString(),
        /* Provperioden börjar här: sju dagar, utan kort — samma löfte som
           startsidan ger. Alla börjar på mallnivån; design och full service
           är säljsamtal, inte något man råkar registrera sig till. Bokningen
           följer vad de valde i registreringen och bekräftas av betalningen;
           väljer de om vid köpet vinner köpet. */
        /*
         * Paketet från länken, men bara som en anteckning om vad de sagt sig
         * vilja ha.
         *
         * Nivån sätts till mall oavsett vad adressraden påstår. Skulle den
         * styra planen kunde vem som helst skriva ?paket=fullservice och få
         * ett paket värt 699 kr i månaden på ett sjudagarsprov. Planen höjs
         * när betalningen finns — av webhooken, som läser Stripe.
         *
         * Underlaget sparas ändå, så att du ser i admin vem som kom in genom
         * vilken dörr och kan följa upp.
         */
        plan:          'mall',
        har_bokning:   valt.bokning,
        ...(brief ? { design_brief: brief } : {}),
        trial_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        /* Kontaktuppgifterna hör till kunden, inte bara till deras hemsida.
           Låg de bara i sajtens innehåll gick de inte att se någon annanstans,
           försvann om kunden redigerade bort kontaktsektionen, och salongen
           fick skriva in samma telefonnummer en gång till under Meddelanden. */
        ...(epost?.trim()   ? { contact_email: epost.trim() }   : {}),
        ...(telefon?.trim() ? { contact_phone: telefon.trim() } : {}),
      })
      .select()
      .single()

    if (companyErr) return NextResponse.json({ error: companyErr.message }, { status: 500 })
    company = newCompany
  } else if (epost?.trim() || telefon?.trim()) {
    /* Ett andra försök efter ett halvt misslyckat: fyll i det som saknas utan
       att skriva över något kunden hunnit ändra själv. */
    await admin.from('companies').update({
      ...(epost?.trim()   ? { contact_email: epost.trim() }   : {}),
      ...(telefon?.trim() ? { contact_phone: telefon.trim() } : {}),
    }).eq('id', existingCompany.id)
  }

  if (!company) return NextResponse.json({ error: 'Kunde inte skapa företag.' }, { status: 500 })

  /*
   * Kom de in genom en premiumlänk blir det en förfrågan.
   *
   * Kontot står på mallnivån tills en betalning finns — men någon har sagt att
   * de vill ha en formgiven sida, och det ska inte försvinna in i en JSON-rad
   * ingen läser. Samma lista som uppgraderingar från panelen, samma ställe i
   * admin, samma avbockning.
   */
  if (valtPaket === 'design' || valtPaket === 'fullservice') {
    try {
      await admin.from('paket_forfragan').insert({
        company_id: company.id,
        fran_plan:  'mall',
        till_plan:  valtPaket,
        meddelande: 'Kom in genom registreringen med paketet valt',
      })
    } catch { /* tabellen inte skapad — registreringen ska gå ändå */ }
  }

  /* Registreringen är avklarad i och med det här anropet. Skrivs innan sajten
     byggs: går något fel längre ner ska kunden inte kastas tillbaka till
     början av guiden med allt ifyllt en gång till. */
  await sparaOnboarding(admin, company.id, {
    steg:    'klar',
    klartAt: new Date().toISOString(),
    vill:    valt,
    mall:    valt.sajt ? (template ?? null) : null,
    harSajt: !!harSajt,
    kontakt: { epost: epost?.trim() ?? '', telefon: telefon?.trim() ?? '' },
  })

  /* Ingen sajt åt den som sagt att de behåller sin egen. En tom sida i
     panelen som de aldrig bett om är inte hjälpsam, den är i vägen — och den
     skulle dessutom räknas som deras när vi mäter. */
  if (!valt.sajt) {
    return NextResponse.json({ ok: true, companyId: company.id, slug, sajt: false })
  }

  // Upsert site_config (safe to retry if previous attempt partially failed)
  const { error: configErr } = await admin
    .from('site_config')
    .upsert({
      company_id: company.id,
      template,
      language,
      features,
      content:    seeded,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })

  if (configErr) return NextResponse.json({ error: configErr.message }, { status: 500 })

  /*
   * Inga tjänster seedas längre.
   *
   * Förut fylldes tabellen med branschens exempelpriser vid registreringen.
   * Det gav en bokningssida som fungerade från dag ett — och som tog emot
   * riktiga bokningar på priser salongen aldrig satt. En kund bokade en
   * klippning för 650 kr och salongen tog 750.
   *
   * Tom lista betyder nu "har inte lagt upp sina tjänster". Panelen visar
   * branschpaketet bredvid som förhandsvisning att utgå från, bokningssidan
   * säger att tjänsterna inte är publicerade, och ingenting påstår att ett
   * pris är salongens förrän de skrivit det själva.
   */

  // Seed default weekly availability
  await admin
    .from('booking_availability')
    .insert(DEFAULT_AVAILABILITY.map(a => ({ ...a, company_id: company.id })))

  return NextResponse.json({ ok: true, companyId: company.id, slug })
}
