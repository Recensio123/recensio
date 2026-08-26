/*
 * Bokningsbekräftelsen till kunden.
 *
 * Två olika mail, inte ett med en variabel i. En bekräftad tid och en mottagen
 * förfrågan är olika besked, och salongens egen text är skriven för det första
 * fallet — *"din tid är bokad och klar"* skickat till någon vars tid ännu inte
 * är godkänd är ett löfte vi inte får ge. Väljer salongen manuell bekräftelse
 * får kunden därför vår neutrala formulering, och deras text används när tiden
 * verkligen är klar.
 *
 * Avsändarnamnet är salongens, adressen vår, och svaret går till salongen. Så
 * ser kunden salongen i inkorgen, och ett svar landar där någon läser det.
 */

import type { createAdminClient } from './supabase/admin'
import { skickaOchLogga } from './utskickslogg'
import type { MessageResult, Channel } from './sendMessage'
import { fill, smsVärden, datumText, tidText } from './bookingText'
import { fetchPolicy } from './bookingPolicy'
import { aktivMall } from './messageTemplates'
import { salonOrigin, salonPhone, smsAvsandare, mailAvsandare, svarsInfo, kortAvboka, esc } from './mailParties'
import { ramRader } from './meddelandeRam'

/* Samma form som de övriga bokningsmodulerna använder. */
type Admin = ReturnType<typeof createAdminClient>

/*
 * Skäl som inte är fel och därför inte ska loggas.
 *
 * Kunden lämnade ingen adress, utskicken är inte påslagna ännu, eller
 * bekräftelsen har redan gått ut — det sista är normaltillståndet varje gång en
 * salong trycker bekräfta på en tid som godkändes automatiskt. Att logga dem
 * hade dränkt de verkliga felen i brus.
 */
export const TYSTA = [
  'no_email', 'not_configured', 'no_from',
  'already_sent', 'not_confirmed', 'not_cancelled', 'not_needed', 'no_salon_address',
]

export type ConfirmationInput = {
  companyId:        string
  /** Bokningen utskicket hör till. Bara för loggen — saknas den räknas
   *  utskicket ändå, det går bara inte att spåra till en enskild tid. */
  bookingId?:       string | null
  companyName:      string
  customerName:     string
  customerEmail:    string | null
  serviceName:      string
  bookingDate:      string
  startTime:        string
  staffName:        string | null
  reference:        string
  /** Relativ väg till avbokningen, eller null i äldre databaser. */
  cancelPath:       string | null
  /** Kort kod till samma sida. SMS:et bär den i stället för den fullständiga
   *  vägen — åttio tecken är halva meddelandet. */
  cancelCode?:      string | null
  status:           'confirmed' | 'pending'
  /** Salongens egen text. Används bara när tiden är bekräftad. */
  confirmationText: string | null
  /** Salongens ämnesrad, samma villkor. Tom vid SMS — där finns ingen. */
  confirmationSubject?: string | null
  /** För SMS-kanalen. Utan nummer eller samtycke går bara mailet. */
  customerPhone:    string | null
  smsOptIn:         boolean
  channel:          Channel
}

/*
 * Bekräftelsen för en bokning, hämtad ur databasen.
 *
 * Anropas från tre håll — kundens bokning, salongens godkännande och en bokning
 * salongen lägger in själv — och därför läser den allt den behöver på egen hand
 * i stället för att varje anropare skickar tolv fält. Ett ställe som bygger
 * mailet betyder ett ställe att ändra det på.
 *
 * `confirmation_sent_at` är hela kopplingen till inställningen för godkännande.
 * Är stämpeln satt har kunden fått sin bekräftelse och ingen andra går ut, vare
 * sig tiden godkändes automatiskt vid bokningen eller för hand tre timmar
 * senare. Utskicket behöver alltså inte veta vilken inställning salongen har.
 */
export async function sendConfirmationFor(admin: Admin, bookingId: string): Promise<MessageResult> {
  /* Stämpelkolumnen är den nyare migrationen. Läs med den först; en databas som
     ännu inte fått den får raden den förstår, och skyddet mot dubbla mail
     saknas då — bättre än att bekräftelsen slutar gå ut helt i glappet mellan
     driftsättning och migration. En sammanhängande select-sträng: delas den upp
     med + tappar klienten sin typinformation och varje fält blir okänt. */
  let stämpelFinns = true
  let { data: b } = await admin
    .from('bookings')
    .select('id, company_id, customer_name, customer_email, customer_phone, service_name, booking_date, start_time, staff_id, status, booking_ref, cancel_token, cancel_code, confirmation_sent_at')
    .eq('id', bookingId)
    .maybeSingle()

  if (!b) {
    stämpelFinns = false
    const igen = await admin
      .from('bookings')
      .select('id, company_id, customer_name, customer_email, customer_phone, service_name, booking_date, start_time, staff_id, status, booking_ref, cancel_token, cancel_code')
      .eq('id', bookingId)
      .maybeSingle()
    b = igen.data as typeof b
  }

  if (!b)                        return { sent: false, reason: 'no_booking' }
  if (b.status !== 'confirmed')  return { sent: false, reason: 'not_confirmed' }
  if (b.confirmation_sent_at)    return { sent: false, reason: 'already_sent' }
  /* Varken adress eller nummer: inget att skicka till, och inget skäl att läsa
     resten. En bokning salongen tagit över disken har ibland ingetdera. */
  if (!b.customer_email && !b.customer_phone) return { sent: false, reason: 'nothing_to_send' }

  const { data: company } = await admin
    .from('companies')
    .select('name, slug')
    .eq('id', b.company_id)
    .single()

  /* Texten: salongens mall först, sedan den gamla kolumnen, sist standarden.
     Migrationen flyttar in befintliga texter i mallen, men koden läser
     kolumnen så länge den finns — en salong ska inte tappa sin formulering i
     glappet mellan driftsättning och migration. */
  const policy = await fetchPolicy(admin, b.company_id as string)
  const { mall, kanal } = await aktivMall(admin, b.company_id as string, 'confirmation')

  /* Avslagen: salongen skickar ingen bekräftelse alls. Det är ett val de får
     göra — bokningen syns ändå i kalendern. */
  if (!kanal) return { sent: false, reason: 'disabled' }

  /* Kundens samtycke till SMS. Saknas kolumnen behandlas det som nej — att
     gissa ja vore att skicka utan tillstånd. */
  let smsOptIn = false
  if (b.customer_phone) {
    const { data: kund } = await admin
      .from('customers')
      .select('sms_opt_in')
      .eq('company_id', b.company_id)
      .eq('phone', b.customer_phone)
      .maybeSingle()
    smsOptIn = Boolean(kund?.sms_opt_in)
  }

  /* Namnet på den som tar emot, när kalendern har medarbetare. */
  let staffName: string | null = null
  if (b.staff_id) {
    const { data: s } = await admin.from('staff').select('name').eq('id', b.staff_id).maybeSingle()
    staffName = (s?.name as string) ?? null
  }

  const result = await sendBookingConfirmation(admin, {
    companyId:        b.company_id as string,
    bookingId:        b.id as string,
    companyName:      (company?.name as string) || 'Din salong',
    customerName:     b.customer_name as string,
    customerEmail:    (b.customer_email as string) ?? null,
    serviceName:      b.service_name as string,
    bookingDate:      b.booking_date as string,
    startTime:        b.start_time as string,
    staffName,
    reference:        (b.booking_ref as string) ?? '',
    cancelPath:       b.cancel_token && company?.slug
      ? `/book/${company.slug}/avboka/${b.cancel_token}`
      : null,
    cancelCode:       (b.cancel_code as string) ?? null,
    status:           'confirmed',
    confirmationText: mall.body.trim() || policy.confirmation_text || null,
    confirmationSubject: mall.subject,
    customerPhone:    (b.customer_phone as string) ?? null,
    smsOptIn,
    channel:          kanal,
  })

  /* Stämpla bara när det gick fram. Ett misslyckat försök ska kunna göras om —
     annars förlorar kunden sin bekräftelse för alltid på ett tillfälligt fel. */
  if (result.sent && stämpelFinns) {
    await admin
      .from('bookings')
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq('id', bookingId)
  }

  return result
}

export async function sendBookingConfirmation(
  admin: Admin,
  b: ConfirmationInput,
): Promise<MessageResult> {
  const [origin, phone, avsändare, mejlnamn] = await Promise.all([
    salonOrigin(admin, b.companyId),
    salonPhone(admin, b.companyId),
    smsAvsandare(admin, b.companyId),
    mailAvsandare(admin, b.companyId),
  ])
  /* SMS:et får den korta formen av avbokningslänken. Den räknas ut här uppe
     eftersom svarsraden beror på den: bär meddelandet redan en länk behövs inte
     telefonnumret i SMS:et, och de tecknen kostar. */
  const kortUrl = kortAvboka(origin, b.cancelCode)
  const svar    = svarsInfo(phone, 'bokning', Boolean(kortUrl))

  const datum = datumText(b.bookingDate)
  const tid   = tidText(b.startTime)

  const values = {
    '{namn}':        b.customerName,
    '{behandling}':  b.serviceName,
    '{datum}':       datum,
    '{tid}':         tid,
    '{medarbetare}': b.staffName ?? '',
    '{salong}':      b.companyName,
  }

  /* Salongens ord först när tiden är klar, vår neutrala rad när den inte är.
     Samma text renderas två gånger: en för mailet med fullständiga värden, en
     för SMS:et där tilltalsnamn och första behandling håller det inom ett
     meddelande. */
  const lead = b.status === 'confirmed'
    ? (b.confirmationText?.trim() ? fill(b.confirmationText, values) : `Din tid hos ${b.companyName} är bokad.`)
    : `Tack ${b.customerName}! Vi har tagit emot din förfrågan. ${b.companyName} bekräftar tiden så snart de sett den — du får ett nytt mail då.`

  const smsLead = b.status === 'confirmed'
    ? (b.confirmationText?.trim() ? fill(b.confirmationText, smsVärden(values)) : `Din tid hos ${b.companyName} är bokad.`)
    : `Tack ${smsVärden(values)['{namn}']}! Vi har tagit emot din förfrågan. ${b.companyName} bekräftar tiden så snart de sett den.`

  const rader = ramRader('confirmation', {
    behandling: b.serviceName, datum, tid,
    medarbetare: b.staffName, referens: b.reference,
  })

  const cancelUrl = b.cancelPath && origin ? `${origin}${b.cancelPath}` : null

  /* Salongens ämnesrad när tiden är klar, vår neutrala när den väntar på
     godkännande. Samma regel som brödtexten redan följer: deras formulering
     lovar en bokad tid, och det löftet får inte ges innan någon sagt ja. */
  const subject = b.status === 'confirmed'
    ? (b.confirmationSubject?.trim()
        ? fill(b.confirmationSubject, values)
        : `Din tid ${datum} kl ${tid} — ${b.companyName}`)
    : `Vi har tagit emot din bokning — ${b.companyName}`

  return skickaOchLogga(admin, {
    companyId: b.companyId, bookingId: b.bookingId ?? null, kind: 'confirmation',
  }, {
    channel:  b.channel,
    salong:   b.companyName,
    email:    b.customerEmail,
    phone:    b.customerPhone,
    smsOptIn: b.smsOptIn,
    smsFrom:  avsändare,
    mailFrom: mejlnamn,
    subject,
    text:     textBody(lead, rader, cancelUrl, b.status, svar.text),
    html:     htmlBody(lead, rader, cancelUrl, b.status, b.companyName, svar.html),
    /* SMS:et är beskedet, tiden och vägen ur bokningen. Avbokningslänken är
       inte något salongen kan välja bort: en kund som inte kan avboka klockan
       elva på kvällen uteblir i stället, och den tiden går inte att sälja om. */
    /* Tiden står i salongens text, där {datum} och {tid} är obligatoriska och
       inte går att spara bort. Bara vårt eget besked om en väntande förfrågan
       saknar den, och där lägger vi till den. */
    sms:      `${smsLead}${b.status === 'confirmed' ? '' : ` ${datum} kl ${tid}.`}${kortUrl ? ` Din bokning: ${kortUrl}` : ''} ${svar.sms}`
                .replace(/\s+/g, ' ').trim(),
  })
}


/* ── Innehållet ──────────────────────────────────────────────────────────── */

function textBody(
  lead: string, rader: [string, string][], cancelUrl: string | null, status: string,
  svar: string,
): string {
  const delar = [
    lead,
    '',
    ...rader.map(([k, v]) => `${k}: ${v}`),
  ]
  if (cancelUrl) {
    delar.push('', status === 'confirmed'
      ? `Behöver du avboka eller ändra tiden: ${cancelUrl}`
      : `Vill du dra tillbaka förfrågan: ${cancelUrl}`)
  }
  delar.push('', svar)
  return delar.join('\n')
}

/* Ren HTML med infogade stilar och inga bilder. Gmail och Outlook stryker
   stilblock och blockerar bilder som standard, så allt som ska synas måste
   stå i attributet — och mailet måste vara läsbart även om inget av det
   kommer fram. */
function htmlBody(
  lead: string, rader: [string, string][], cancelUrl: string | null,
  status: string, salong: string, svar: string,
): string {
  const rows = rader.map(([k, v]) => `
      <tr>
        <td style="padding:4px 16px 4px 0;color:#64748b;font-size:14px;white-space:nowrap">${esc(k)}</td>
        <td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(v)}</td>
      </tr>`).join('')

  const cancel = cancelUrl ? `
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6">
      ${status === 'confirmed' ? 'Behöver du avboka eller ändra tiden?' : 'Vill du dra tillbaka förfrågan?'}
      <a href="${esc(cancelUrl)}" style="color:#0f172a">Öppna din bokning</a>.
    </p>` : ''

  return `<!doctype html>
<html lang="sv"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#0f172a">${esc(lead)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>
    ${cancel}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">${esc(salong)}<br>${svar}</p>
  </div>
</body></html>`
}

