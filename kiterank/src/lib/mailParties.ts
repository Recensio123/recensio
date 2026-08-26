/*
 * Vem mailen går till och från.
 *
 * Delat av bekräftelsen och avbokningen, eftersom svaren måste hamna på samma
 * ställe i båda. Två utskick som räknar ut mottagaren på sitt eget sätt är två
 * utskick som med tiden räknar olika.
 */

import type { createAdminClient } from './supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/*
 * Salongens inloggningsadress.
 *
 * Det finns inget eget kontaktmailfält ännu, och inloggningsadressen är den enda
 * adress vi vet att någon i salongen läser — bättre att kundens svar hamnar där
 * än i ingenting. Ett riktigt kontaktfält hör hemma i panelen och ersätter den
 * här när det finns.
 */
export async function salonReplyTo(admin: Admin, companyId: string): Promise<string | null> {
  const { data: company } = await admin
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single()

  if (!company?.user_id) return null

  const { data } = await admin.auth.admin.getUserById(company.user_id as string)
  return data?.user?.email ?? null
}

/** Salongens verifierade egen domän, eller null.
 *
 *  Skilt från `salonOrigin` för att länkarna ska kunna bli kortare när den
 *  finns: på salongens egen adress säger domänen redan vilken salong det gäller,
 *  och sluggen blir ett onödigt påhäng i ett meddelande som betalas per tecken. */
export async function egenDoman(admin: Admin, companyId: string): Promise<string | null> {
  const { data } = await admin
    .from('custom_domains')
    .select('domain')
    .eq('company_id', companyId)
    .eq('is_primary', true)
    .not('verified_at', 'is', null)
    .maybeSingle()

  return data?.domain ? `https://${data.domain}` : null
}

/** Salongens egen domän när den är verifierad, annars vår adress. Länkar i
 *  mailet ska ligga på samma adress som resten av deras sida. */
export async function salonOrigin(admin: Admin, companyId: string): Promise<string | null> {
  return (await egenDoman(admin, companyId))
    ?? (process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || null)
}

/**
 * Den korta vägen till en bokning, för SMS.
 *
 * Den fullständiga adressen är omkring åttio tecken och äter halva utrymmet i
 * ett meddelande som betalas per segment. Utan den här formen fick SMS:et ingen
 * avbokningslänk alls, och kunden lämnades utan väg tillbaka på kvällen när
 * salongen inte svarar.
 *
 * Tom sträng när koden saknas — en bokning från tiden före migrationen har
 * ingen, och då bär meddelandet telefonnumret i stället.
 */
export function kortAvboka(origin: string | null, kod: string | null | undefined): string {
  return origin && kod ? `${origin}/a/${kod}` : ''
}

/**
 * Den korta vägen till salongens sida för omdömen.
 *
 * Google-länken är fyrtio till femtio tecken och säger ingenting för den som
 * läser den. Den här ligger på salongens egen adress när de har en, är kortare,
 * och visar vem som frågar — vilket i ett SMS avgör om den klickas.
 *
 * Faller tillbaka på den sparade länken när vi inte har någon adress att lägga
 * genvägen på. Tom sträng när salongen inte sparat någon länk alls; då ska
 * ingen förfrågan skickas.
 */
export function kortOmdome(
  origin: string | null, slug: string | null | undefined, reviewUrl: string | null | undefined,
  /* Salongens egen domän, när de har en. Då behövs ingen slug i vägen —
     domänen säger redan vilken salong det gäller, och adressen blir tjugo
     tecken kortare. */
  egen?: string | null,
): string {
  const url = reviewUrl?.trim() ?? ''
  if (!url) return ''
  if (egen) return `${egen}/o`
  return origin && slug ? `${origin}/o/${slug}` : url
}

/** Numret salongen skrivit in för sina meddelanden, eller null.
 *
 *  Skilt från hemsidans nummer med flit: en salong kan vilja att
 *  bokningsmeddelanden pekar på en telefon som faktiskt är bemannad, och det
 *  valet ska inte tyst skrivas över nästa gång de redigerar sidan. */
export async function egetNummer(admin: Admin, companyId: string): Promise<string | null> {
  const res = await admin
    .from('companies').select('contact_phone').eq('id', companyId).maybeSingle()
  if (res.error) return null
  const eget = (res.data?.contact_phone as string | null)?.trim()
  return eget || null
}

/** Numret på hemsidans kontaktuppgifter. Utgångspunkten, och det som gäller när
 *  salongen inte skrivit något eget. */
export async function sidansNummer(admin: Admin, companyId: string): Promise<string> {
  const res = await admin
    .from('site_config')
    .select('content')
    .eq('company_id', companyId)
    .maybeSingle()

  if (res.error) return ''
  const content = res.data?.content as { phone?: string } | null
  return content?.phone?.trim() ?? ''
}

/*
 * Salongens telefonnummer, som utskicken ska använda det.
 *
 * Behövs eftersom våra utskick inte går att svara på. Säger vi "svara inte"
 * måste vi säga vart kunden ska vända sig i stället — annars har vi bara stängt
 * en dörr.
 *
 * Salongens eget val först, hemsidans nummer sedan. Ett ställe att fråga, så
 * att mailet och SMS:et aldrig kan peka på olika nummer.
 */
export async function salonPhone(admin: Admin, companyId: string): Promise<string> {
  return (await egetNummer(admin, companyId)) ?? (await sidansNummer(admin, companyId))
}

/** Namnet salongen satt på sin hemsida. Det är vad kunden känner igen — inte
 *  det som råkade skrivas in vid registreringen. */
export async function sidansNamn(admin: Admin, companyId: string): Promise<string> {
  const res = await admin
    .from('site_config').select('content').eq('company_id', companyId).maybeSingle()

  if (res.error) return ''
  const content = res.data?.content as { businessName?: string } | null
  return content?.businessName?.trim() ?? ''
}

/** Avsändarnamnet kundens telefon visar, i rå form.
 *
 *  Salongens eget val först, sedan namnet de satt på hemsidan. Utan bådadera
 *  null, och då faller utskicket tillbaka på kontots företagsnamn. */
export async function smsAvsandare(admin: Admin, companyId: string): Promise<string | null> {
  const res = await admin
    .from('companies').select('sms_sender').eq('id', companyId).maybeSingle()

  const eget = res.error ? null : (res.data?.sms_sender as string | null)
  if (eget?.trim()) return eget

  /* Inget eget val: namnet på hemsidan. Det är det kunden känner igen från
     sidan de nyss bokade på — och en salong som döpt om sig där ska inte
     behöva göra om det här. */
  return (await sidansNamn(admin, companyId)) || null
}

/** Avsändarnamnet inkorgen visar, i rå form.
 *
 *  Samma trappa som SMS:et: eget val, sedan namnet på hemsidan, och utan
 *  bådadera null — då faller utskicket tillbaka på kontots företagsnamn. Att
 *  trappan är densamma är avsikten; två kanaler som hämtar salongens namn på
 *  var sitt sätt blir förr eller senare två kanaler som visar olika namn. */
export async function mailAvsandare(admin: Admin, companyId: string): Promise<string | null> {
  const res = await admin
    .from('companies').select('email_sender').eq('id', companyId).maybeSingle()

  /* Kolumnen är ny och migrationen körs för hand. Saknas den ska bekräftelsen
     gå ut med hemsidans namn, inte utebli. */
  const eget = res.error ? null : (res.data?.email_sender as string | null)
  if (eget?.trim()) return eget

  return (await sidansNamn(admin, companyId)) || null
}

/*
 * Raden som talar om att utskicket är enkelriktat.
 *
 * Ett mail eller SMS som ser ut att komma från salongen inbjuder till svar.
 * Kunden skriver "jag kan inte komma", tror sig ha avbokat, och uteblir —
 * medan salongen aldrig hört något. Det är sämre än att inte ha skickat något.
 *
 * Därför står det rakt ut, och alltid tillsammans med ett alternativ: numret de
 * kan ringa. Finns inget nummer sägs bara att svar inte läses, vilket är sant
 * men sämre — och ett skäl för salongen att fylla i sitt nummer.
 */
export function svarsInfo(
  phone: string,
  /* En recensionsförfrågan handlar om ett besök som redan varit. Det finns
     ingen tid att flytta, så numret hör inte dit — och de nitton tecknen
     avgjorde om standardtexten kostade ett eller två SMS. */
  syfte: 'bokning' | 'omdome' = 'bokning',
  /* Bär meddelandet redan en avbokningslänk finns vägen till en ändring där.
     Numret i SMS:et blir då samma besked två gånger, och de tjugo tecknen är
     ofta skillnaden mellan ett och två meddelanden. Mailet behåller numret —
     där kostar utrymmet ingenting. */
  harLänk = false,
): { text: string; html: string; sms: string } {
  const visaNummer = Boolean(phone) && syfte === 'bokning'
  const ring = visaNummer ? ` Ring oss på ${phone} om du vill ändra något.` : ''

  return {
    text: `Det här mailet går inte att svara på.${ring}`,
    html: `Det här mailet går inte att svara på.${visaNummer ? ` Ring oss på ${esc(phone)} om du vill ändra något.` : ''}`,
    /* I SMS står ingen varning om att svar inte går fram.
       Avsändaren är alfanumerisk — salongens namn — och de flesta telefoner
       kopplar därför bort svarsfältet av sig själva. En rad som förklarar något
       telefonen redan hindrat kostar tjugotvå tecken och låter dessutom som ett
       myndighetsutskick, i ett meddelande som ska kännas som att det kommer från
       frisören. Salonger skriver den inte, och den hör inte hit.
       Kvar står vägen framåt: bär meddelandet redan en länk räcker den, annars
       telefonnumret. Ett nummer säger vart man ska vända sig, vilket en varning
       inte gör. I mailet är det tvärtom — där finns ingen spärr, svaret
       försvinner utan felmeddelande, och utrymmet kostar ingenting. */
    sms:  harLänk || !visaNummer ? '' : `Ring oss ${phone}`,
  }
}

/** Salongens namn och kundens text hamnar i HTML. Utan detta räcker ett
 *  salongsnamn med ett & i för att bryta mailet. */
export function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
