/*
 * Påminnelsen och recensionsförfrågan.
 *
 * Skiljer sig från bekräftelsen och avbokningen på ett sätt som styr allt här:
 * de utlöses inte av något salongen eller kunden gör, utan av en klocka. Ingen
 * begäran finns att hänga dem på, så de behöver något som vaknar och frågar
 * vilka bokningar som är mogna — se api/cron/send-messages.
 *
 * Värdet ligger i just det. En påminnelse minskar uteblivna besök, och en
 * recensionsförfrågan efter ett lyckat besök är det billigaste sättet att få
 * omdömen på Google. Båda ger salongen något varje vecka utan att någon gör
 * något.
 *
 * Stämpeln på bokningen är det som håller dem ärliga. Jobbet vaknar varje timme
 * och skulle utan den skicka samma påminnelse om och om igen ända fram till
 * besöket — vilket för ett SMS också är en räkning.
 */

import type { createAdminClient } from './supabase/admin'
import { skickaOchLogga } from './utskickslogg'
import type { MessageResult } from './sendMessage'
import { datumText, tidText, smsVärden } from './bookingText'
import { templateSettings, renderTemplate, type TemplateKind, type TemplateChannel } from './messageTemplates'
import { salonPhone, salonOrigin, egenDoman, smsAvsandare, svarsInfo, kortAvboka, kortOmdome, esc } from './mailParties'
import { ramRader } from './meddelandeRam'

type Admin = ReturnType<typeof createAdminClient>

/** Bokningen som ett tidsstyrt utskick behöver den. Cron-jobbet har redan läst
 *  raden, så den skickas in i stället för att hämtas igen. */
export type TimedBooking = {
  id:             string
  company_id:     string
  customer_name:  string
  customer_email: string | null
  customer_phone: string | null
  service_name:   string
  booking_date:   string
  start_time:     string
  staff_id:       string | null
  cancel_code?:   string | null
}

export async function sendTimedMessage(
  admin: Admin,
  b: TimedBooking,
  kind: Extract<TemplateKind, 'reminder' | 'review'>,
  /* Kanalen är inte en egenskap hos meddelandet utan vilket meddelande det är.
     Påminnelsen som mail och påminnelsen som SMS har var sin text och var sin
     tidpunkt, och jobbet nedan kallar hit en gång per kanal som är påslagen. */
  channel: TemplateChannel,
): Promise<MessageResult> {
  const s = await templateSettings(admin, b.company_id, kind, channel)
  if (!s.enabled)     return { sent: false, reason: 'disabled' }
  if (!s.body.trim()) return { sent: false, reason: 'no_text' }

  const { data: company } = await admin
    .from('companies')
    .select('name, slug, review_url')
    .eq('id', b.company_id)
    .maybeSingle()

  const salong = (company?.name as string) || 'Din salong'

  /* Recensionsförfrågan utan länk är meningslös: "lämna gärna ett omdöme" utan
     att säga var leder ingen vart, och kunden får ett meddelande de inte kan
     agera på. Hellre inget än det. */
  /* Genvägen på salongens egen adress när den finns, annars Google-länken rakt
     av. Kortare i SMS:et och tydligare för den som läser. */
  const länk = kortOmdome(
    await salonOrigin(admin, b.company_id),
    company?.slug as string | null,
    company?.review_url as string | null,
    await egenDoman(admin, b.company_id),
  )
  if (kind === 'review' && !länk) return { sent: false, reason: 'no_review_url' }

  /* Påminnelsen bär vägen ur bokningen. Det är hela dess nytta: den som inte
     kan komma ska kunna säga det med ett tryck medan de läser, i stället för
     att ringa nästa morgon eller inte alls. Recensionsförfrågan bär den inte —
     besöket har varit. */
  const avboka = kind === 'reminder'
    ? kortAvboka(await salonOrigin(admin, b.company_id), b.cancel_code)
    : ''

  let staffName: string | null = null
  if (b.staff_id) {
    const { data: st } = await admin.from('staff').select('name').eq('id', b.staff_id).maybeSingle()
    staffName = (st?.name as string) ?? null
  }

  const datum = datumText(b.booking_date)
  const tid   = tidText(b.start_time)

  const värden = {
    '{namn}':        b.customer_name,
    /* Bara recensionsförfrågan har den, och där är den obligatorisk. I de andra
       meddelandena finns platshållaren inte att välja, så den blir tom. */
    '{omdömeslänk}': länk,
    '{behandling}':  b.service_name,
    '{datum}':       datum,
    '{tid}':         tid,
    '{medarbetare}': staffName ?? '',
    '{salong}':      salong,
  }

  /* Två renderingar: mailet får fullständiga värden, SMS:et kortade. */
  let text    = renderTemplate(s.body, värden)
  let smsText = renderTemplate(s.body, smsVärden(värden))

  /* Omdömeslänken är obligatorisk i mallen, men en text sparad före den regeln
     kan sakna den. Hellre en länk sist än en förfrågan kunden inte kan svara
     på — den kostar ett SMS och ger ingenting. */
  if (kind === 'review' && länk && !text.includes(länk)) {
    text    = `${text}
${länk}`
    smsText = `${smsText} ${länk}`
  }

  /* Kundens samtycke till SMS. Kolumnen kom med bokningssystemet; en databas
     utan den behandlas som nej, eftersom att gissa ja vore att skicka utan
     tillstånd. */
  let smsOptIn = false
  if (channel === 'sms' && b.customer_phone) {
    const { data: kund } = await admin
      .from('customers')
      .select('sms_opt_in')
      .eq('company_id', b.company_id)
      .eq('phone', b.customer_phone)
      .maybeSingle()
    smsOptIn = Boolean(kund?.sms_opt_in)
  }

  const svar = svarsInfo(
    await salonPhone(admin, b.company_id),
    kind === 'review' ? 'omdome' : 'bokning',
    Boolean(avboka),
  )

  const rader = ramRader(kind, {
    behandling: b.service_name, datum, tid, medarbetare: staffName,
  })

  return skickaOchLogga(admin, {
    companyId: b.company_id, bookingId: b.id, kind,
  }, {
    channel,
    salong,
    email:    b.customer_email,
    phone:    b.customer_phone,
    smsOptIn,
    smsFrom:  channel === 'sms' ? await smsAvsandare(admin, b.company_id) : null,
    /* Ämnesraden är salongens och renderas med samma värden som texten. Den
       avgör om mailet öppnas, så den ska gå att skriva om. */
    subject:  renderTemplate(s.subject, värden),
    text:     textBody(text, rader, svar.text, avboka),
    html:     htmlBody(text, rader, salong, svar.html, avboka),
    /* SMS:et är mallen rakt av. Ingen ram, ingen ämnesrad — och varje extra
       tecken är en kostnad. Omdömeslänken står redan i texten. */
    sms:      `${smsText}${avboka ? ` Din bokning: ${avboka}` : ''} ${svar.sms}`
                .replace(/\s+/g, ' ').trim(),
  })
}

/* ── Innehållet ─────────────────────────────────────────────────────────── */

/*
 * Salongens text som HTML, rad för rad.
 *
 * En rad som bara innehåller en länk blir en knapp. Det är regeln som gör att
 * omdömeslänken kan bo i texten — där salongen kan formulera meningen runt den
 * — och ändå se ut som det steg den är. En länk i löptext är lätt att läsa
 * förbi, och för ett meddelande vars hela syfte är klicket vore det dyrt.
 */
function brödtext(lead: string): string {
  return lead.split('\n').map(rad => {
    const t = rad.trim()
    if (/^https?:\/\/\S+$/.test(t)) {
      return `<p style="margin:24px 0 0">
      <a href="${esc(t)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;padding:11px 20px">Lämna ditt omdöme</a>
    </p>`
    }
    return t
      ? `<p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#0f172a">${esc(rad)}</p>`
      : ''
  }).join('')
}

function textBody(
  lead: string, rader: [string, string][], svar: string, avboka: string,
): string {
  const delar = [lead]
  if (rader.length) delar.push('', ...rader.map(([k, v]) => `${k}: ${v}`))
  if (avboka) delar.push('', `Behöver du avboka eller ändra tiden: ${avboka}`)
  delar.push('', svar)
  return delar.join('\n')
}

function htmlBody(
  lead: string, rader: [string, string][], salong: string,
  svar: string, avboka: string,
): string {
  const rows = rader.map(([k, v]) => `
      <tr>
        <td style="padding:4px 16px 4px 0;color:#64748b;font-size:14px;white-space:nowrap">${esc(k)}</td>
        <td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(v)}</td>
      </tr>`).join('')


  return `<!doctype html>
<html lang="sv"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    ${brödtext(lead)}
    ${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>` : ''}
    ${avboka ? `<p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.6">Behöver du avboka eller ändra tiden? <a href="${esc(avboka)}" style="color:#0f172a">Öppna din bokning</a>.</p>` : ''}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">${esc(salong)}<br>${svar}</p>
  </div>
</body></html>`
}
