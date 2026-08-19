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
import { sendMessage, type MessageResult } from './sendMessage'
import { datumText, tidText, smsVärden } from './bookingText'
import { templateSettings, renderTemplate, type TemplateKind } from './messageTemplates'
import { salonPhone, svarsInfo, esc } from './mailParties'

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
}

export async function sendTimedMessage(
  admin: Admin,
  b: TimedBooking,
  kind: Extract<TemplateKind, 'reminder' | 'review'>,
): Promise<MessageResult> {
  const s = await templateSettings(admin, b.company_id, kind)
  if (!s.enabled)     return { sent: false, reason: 'disabled' }
  if (!s.body.trim()) return { sent: false, reason: 'no_text' }

  const { data: company } = await admin
    .from('companies')
    .select('name, review_url')
    .eq('id', b.company_id)
    .maybeSingle()

  const salong = (company?.name as string) || 'Din salong'

  /* Recensionsförfrågan utan länk är meningslös: "lämna gärna ett omdöme" utan
     att säga var leder ingen vart, och kunden får ett meddelande de inte kan
     agera på. Hellre inget än det. */
  const länk = (company?.review_url as string | null)?.trim() || ''
  if (kind === 'review' && !länk) return { sent: false, reason: 'no_review_url' }

  let staffName: string | null = null
  if (b.staff_id) {
    const { data: st } = await admin.from('staff').select('name').eq('id', b.staff_id).maybeSingle()
    staffName = (st?.name as string) ?? null
  }

  const datum = datumText(b.booking_date)
  const tid   = tidText(b.start_time)

  const värden = {
    '{namn}':        b.customer_name,
    '{behandling}':  b.service_name,
    '{datum}':       datum,
    '{tid}':         tid,
    '{medarbetare}': staffName ?? '',
    '{salong}':      salong,
  }

  /* Två renderingar: mailet får fullständiga värden, SMS:et kortade. */
  const text    = renderTemplate(s.body, värden)
  const smsText = renderTemplate(s.body, smsVärden(värden))

  /* Kundens samtycke till SMS. Kolumnen kom med bokningssystemet; en databas
     utan den behandlas som nej, eftersom att gissa ja vore att skicka utan
     tillstånd. */
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

  const svar = svarsInfo(
    await salonPhone(admin, b.company_id),
    kind === 'review' ? 'omdome' : 'bokning',
  )

  const rader: [string, string][] = kind === 'reminder'
    ? [
        ['Behandling', b.service_name],
        ['Datum',      datum],
        ['Tid',        tid],
        ...(staffName ? [['Hos', staffName] as [string, string]] : []),
      ]
    : []

  return sendMessage({
    channel:  s.channel,
    salong,
    email:    b.customer_email,
    phone:    b.customer_phone,
    smsOptIn,
    subject:  kind === 'reminder'
      ? `Påminnelse: din tid ${datum} kl ${tid} — ${salong}`
      : `Tack för ditt besök — ${salong}`,
    text:     textBody(text, rader, länk, kind, svar.text),
    html:     htmlBody(text, rader, länk, kind, salong, svar.html),
    /* SMS:et är mallen rakt av plus länken. Ingen ram, ingen ämnesrad — och
       varje extra tecken är en kostnad. */
    sms:      `${smsText}${länk ? ` ${länk}` : ''} ${svar.sms}`.replace(/\s+/g, ' ').trim(),
  })
}

/* ── Innehållet ─────────────────────────────────────────────────────────── */

function textBody(
  lead: string, rader: [string, string][], länk: string, kind: string, svar: string,
): string {
  const delar = [lead]
  if (rader.length) delar.push('', ...rader.map(([k, v]) => `${k}: ${v}`))
  if (länk) delar.push('', kind === 'review' ? `Lämna ditt omdöme: ${länk}` : länk)
  delar.push('', svar)
  return delar.join('\n')
}

function htmlBody(
  lead: string, rader: [string, string][], länk: string, kind: string, salong: string,
  svar: string,
): string {
  const rows = rader.map(([k, v]) => `
      <tr>
        <td style="padding:4px 16px 4px 0;color:#64748b;font-size:14px;white-space:nowrap">${esc(k)}</td>
        <td style="padding:4px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(v)}</td>
      </tr>`).join('')

  /* Recensionsförfrågan får en knapp och inte en länk i löptext. Steget ska vara
     omöjligt att missa — det är hela meddelandets syfte. */
  const knapp = länk && kind === 'review' ? `
    <p style="margin:24px 0 0">
      <a href="${esc(länk)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;padding:11px 20px">Lämna ditt omdöme</a>
    </p>` : länk ? `
    <p style="margin:24px 0 0;font-size:13px"><a href="${esc(länk)}" style="color:#0f172a">${esc(länk)}</a></p>` : ''

  return `<!doctype html>
<html lang="sv"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#0f172a">${esc(lead)}</p>
    ${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows}</table>` : ''}
    ${knapp}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b">${esc(salong)}<br>${svar}</p>
  </div>
</body></html>`
}
