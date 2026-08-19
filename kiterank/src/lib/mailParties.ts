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

/** Salongens egen domän när den är verifierad, annars vår adress. Länkar i
 *  mailet ska ligga på samma adress som resten av deras sida. */
export async function salonOrigin(admin: Admin, companyId: string): Promise<string | null> {
  const { data } = await admin
    .from('custom_domains')
    .select('domain')
    .eq('company_id', companyId)
    .eq('is_primary', true)
    .not('verified_at', 'is', null)
    .maybeSingle()

  if (data?.domain) return `https://${data.domain}`
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || null
}

/*
 * Salongens telefonnummer.
 *
 * Behövs eftersom våra utskick inte går att svara på. Säger vi "svara inte"
 * måste vi säga vart kunden ska vända sig i stället — annars har vi bara stängt
 * en dörr. Numret står i salongens sidinnehåll, som de själva skrivit.
 */
export async function salonPhone(admin: Admin, companyId: string): Promise<string> {
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
): { text: string; html: string; sms: string } {
  const visaNummer = Boolean(phone) && syfte === 'bokning'
  const ring = visaNummer ? ` Ring oss på ${phone} om du vill ändra något.` : ''

  return {
    text: `Det här mailet går inte att svara på.${ring}`,
    html: `Det här mailet går inte att svara på.${visaNummer ? ` Ring oss på ${esc(phone)} om du vill ändra något.` : ''}`,
    /* SMS betalas per tecken, så här är det kortaste som ändå säger båda
       sakerna: att svar inte når fram, och vart de i stället ska vända sig. */
    sms:  visaNummer ? `Obs: går ej att svara på detta SMS. Ring ${phone}.`
                     : 'Obs: går ej att svara på detta SMS.',
  }
}

/** Salongens namn och kundens text hamnar i HTML. Utan detta räcker ett
 *  salongsnamn med ett & i för att bryta mailet. */
export function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
