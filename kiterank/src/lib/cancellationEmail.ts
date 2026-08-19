/*
 * Avbokningen, till båda parter.
 *
 * Kunden får en kvittens. Det är inte en artighet: den som avbokat utan att få
 * något skriftligt ringer salongen för att kontrollera, och det samtalet är
 * dyrare för salongen än mailet.
 *
 * Salongen får en avisering, men bara när kunden avbokade. Avbokar salongen själv
 * vet de redan — ett mail om sin egen åtgärd är brus, och brus gör att man slutar
 * läsa aviseringar överhuvudtaget.
 *
 * Salongen kan skriva om texten för den enskilda kunden innan den går. En
 * inställd dag har ett skäl — sjukdom, en stängd salong — och "din tid är
 * avbokad" utan det skälet läser illa när det var salongen som ställde in.
 */

import type { createAdminClient } from './supabase/admin'
import { sendMail, platformFrom, type MailResult } from './mailer'
import { sendMessage, type MessageResult } from './sendMessage'
import { datumText, tidText, smsVärden } from './bookingText'
import { templateSettings, renderTemplate } from './messageTemplates'
import { salonReplyTo, salonOrigin, salonPhone, svarsInfo, esc } from './mailParties'

type Admin = ReturnType<typeof createAdminClient>

export type CancelledBy = 'customer' | 'salon'

export async function sendCancellationFor(
  admin: Admin,
  bookingId: string,
  opts: {
    by: CancelledBy
    /** Salongens omskrivning för just den här kunden. Tom eller utelämnad
     *  betyder att mallen gäller. */
    body?: string | null
  },
): Promise<MessageResult> {
  /* Stämpelkolumnen är den nyare migrationen; en databas utan den får raden den
     förstår och saknar då skyddet mot dubbla besked. */
  let stämpelFinns = true
  let { data: b } = await admin
    .from('bookings')
    .select('id, company_id, customer_name, customer_email, customer_phone, service_name, booking_date, start_time, staff_id, status, booking_ref, cancellation_sent_at')
    .eq('id', bookingId)
    .maybeSingle()

  if (!b) {
    stämpelFinns = false
    const igen = await admin
      .from('bookings')
      .select('id, company_id, customer_name, customer_email, customer_phone, service_name, booking_date, start_time, staff_id, status, booking_ref')
      .eq('id', bookingId)
      .maybeSingle()
    b = igen.data as typeof b
  }

  if (!b)                          return { sent: false, reason: 'no_booking' }
  if (b.status !== 'cancelled')    return { sent: false, reason: 'not_cancelled' }
  if (b.cancellation_sent_at)      return { sent: false, reason: 'already_sent' }

  const from = platformFrom()
  if (!from) return { sent: false, reason: 'no_from' }

  const { data: company } = await admin
    .from('companies')
    .select('name')
    .eq('id', b.company_id)
    .single()

  const salong = (company?.name as string) || 'Din salong'
  const datum  = datumText(b.booking_date as string)
  const tid    = tidText(b.start_time as string)

  let staffName: string | null = null
  if (b.staff_id) {
    const { data: s } = await admin.from('staff').select('name').eq('id', b.staff_id).maybeSingle()
    staffName = (s?.name as string) ?? null
  }

  /* Aviseringens mottagare, inte ett svarsspår — kundens utskick har inget. */
  const replyTo = await salonReplyTo(admin, b.company_id as string)
  const svar    = svarsInfo(await salonPhone(admin, b.company_id as string))

  /* Aviseringen till salongen går även när kunden inte lämnat mailadress — det
     är salongens dag som ändrats, oavsett hur kunden bokade. */
  const avisering = opts.by === 'customer'
    ? await notifySalon(admin, {
        to: replyTo, from, salong,
        kund: b.customer_name as string,
        behandling: b.service_name as string,
        datum, tid, staffName,
      })
    : { sent: false, reason: 'not_needed' as string }

  if (!b.customer_email && !b.customer_phone) {
    return avisering.sent ? { sent: true, reason: 'salon_only' } : { sent: false, reason: 'nothing_to_send' }
  }

  /* Salongens omskrivning går före mallen, men bara för det här mailet — den
     sparas inte som ny mall. Nästa avbokning använder mallen igen. */
  const inställning = await templateSettings(admin, b.company_id as string, 'cancellation')
  const mall = opts.body?.trim() ? opts.body : inställning.body

  /* Kundens samtycke till SMS. Saknas kolumnen behandlas det som nej. */
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

  const värden = {
    '{namn}':        b.customer_name as string,
    '{behandling}':  b.service_name as string,
    '{datum}':       datum,
    '{tid}':         tid,
    '{medarbetare}': staffName ?? '',
    '{salong}':      salong,
  }

  /* Två renderingar: mailet får fullständiga värden, SMS:et kortade så det
     håller sig inom ett meddelande. */
  const text    = renderTemplate(mall, värden)
  const smsText = renderTemplate(mall, smsVärden(värden))

  const rader: [string, string][] = [
    ['Behandling', b.service_name as string],
    ['Datum',      datum],
    ['Tid',        tid],
    ...(b.booking_ref ? [['Bokningsnr', b.booking_ref as string] as [string, string]] : []),
  ]

  const origin  = await salonOrigin(admin, b.company_id as string)
  const bokaNy  = origin ? `${origin}` : null

  const result = await sendMessage({
    channel:  inställning.channel,
    salong,
    email:    (b.customer_email as string) ?? null,
    phone:    (b.customer_phone as string) ?? null,
    smsOptIn,
    subject:  `Avbokad tid ${datum} — ${salong}`,
    text:     textBody(text, rader, bokaNy, svar.text),
    html:     htmlBody(text, rader, bokaNy, salong, svar.html),
    sms:      `${smsText} ${svar.sms}`.replace(/\s+/g, ' ').trim(),
  })

  if (result.sent && stämpelFinns) {
    await admin
      .from('bookings')
      .update({ cancellation_sent_at: new Date().toISOString() })
      .eq('id', bookingId)
  }

  return result
}

/* ── Aviseringen till salongen ──────────────────────────────────────────── */

/*
 * En frigjord tid är information salongen kan agera på samma dag — ringa någon
 * på väntelistan, gå hem tidigare, flytta en annan kund. Därför står tiden i
 * ämnesraden: den läses på en telefon i en salong, mellan två kunder, och ska
 * gå att förstå utan att mailet öppnas.
 */
async function notifySalon(admin: Admin, x: {
  to: string | null; from: string; salong: string
  kund: string; behandling: string; datum: string; tid: string; staffName: string | null
}): Promise<MailResult> {
  if (!x.to) return { sent: false, reason: 'no_salon_address' }

  const rader: [string, string][] = [
    ['Kund',       x.kund],
    ['Behandling', x.behandling],
    ['Datum',      x.datum],
    ['Tid',        x.tid],
    ...(x.staffName ? [['Hos', x.staffName] as [string, string]] : []),
  ]

  const lead = `${x.kund} har avbokat sin tid. Tiden är nu ledig igen i din kalender.`

  return sendMail({
    to:      x.to,
    from:    { email: x.from, name: 'Kiterank' },
    subject: `Avbokat: ${x.datum} kl ${x.tid} — ${x.kund}`,
    text:    textBody(lead, rader, null),
    html:    htmlBody(lead, rader, null, x.salong),
  })
}

/* ── Innehållet ─────────────────────────────────────────────────────────── */

function textBody(
  lead: string, rader: [string, string][], bokaNy: string | null, svar = '',
): string {
  const delar = [lead, '', ...rader.map(([k, v]) => `${k}: ${v}`)]
  if (bokaNy) delar.push('', `Boka en ny tid: ${bokaNy}`)
  if (svar)   delar.push('', svar)
  return delar.join('\n')
}

function htmlBody(
  lead: string, rader: [string, string][], bokaNy: string | null, salong: string,
  svar = '',
): string {
  const rows = rader.map(([k, v]) => `
      <tr>
        <td style="padding:4px 16px 4px 0;color:#64748b;font-size:14px;white-space:nowrap">${esc(k)}</td>
        <td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(v)}</td>
      </tr>`).join('')

  const ny = bokaNy ? `
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6">
      <a href="${esc(bokaNy)}" style="color:#0f172a">Boka en ny tid</a>
    </p>` : ''

  return `<!doctype html>
<html lang="sv"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#0f172a">${esc(lead)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>
    ${ny}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">${esc(salong)}${svar ? `<br>${svar}` : ''}</p>
  </div>
</body></html>`
}
