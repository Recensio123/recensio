import { NextResponse } from 'next/server'
import { currentCompany, ownDomainRow } from '@/lib/companyScope'
import { normaliseDomain } from '@/lib/domainTarget'
import { mailProvider, forwardRecords, type MailMode } from '@/lib/mailProviders'
import {
  cfConfigured, putRecord, clearRecords, enableEmailRouting, addMailDestination,
  mailDestinationVerified, forwardEverything, stopForwarding, CloudflareError,
} from '@/lib/cloudflare'

/*
 * Mailen på salongens domän.
 *
 * Fyra lägen, ett i taget: ingen mail, vidarebefordran till en adress de redan
 * har, eller MX mot Gmail respektive Outlook. De kan inte kombineras — alla tre
 * aktiva lägen vill äga MX-posten på samma domän, och två samtidigt är inte en
 * inställning utan mail som ibland kommer fram.
 *
 * Därför rivs den gamla uppsättningen alltid innan den nya skrivs. Ett byte som
 * bara lägger till lämnar kvar en MX mot den förra leverantören, och då avgör
 * prioritetssiffran vart mailen råkar gå.
 *
 * Vad vi inte gör: skapar brevlådan. Google och Microsoft säljs vidare bara av
 * godkända partners, så kontot signar salongen själv. Det vi tar bort är hela
 * DNS-biten, alltså den del de faktiskt fastnar på.
 */

const MODES: MailMode[] = ['none', 'forward', 'google', 'microsoft']

export async function POST(req: Request) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!cfConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const { domain: raw, mode: rawMode, forwardTo, action } = await req.json()
  const domain = normaliseDomain(String(raw ?? ''))
  const row    = await ownDomainRow(c, domain)

  if (!row)          return NextResponse.json({ error: 'unknown_domain' }, { status: 404 })
  /* Mail kräver att vi håller zonen. I postläget äger kunden sin egen DNS och
     då är mailen deras att sköta — vi kan inte skriva i någon annans zon. */
  if (!row.zone_id)  return NextResponse.json({ error: 'no_zone' }, { status: 409 })

  try {
    /* ── Har mottagaren bekräftat sin adress? ──────────────────────────── */
    if (action === 'check') {
      if (row.mail_mode !== 'forward' || !row.mail_forward_to) {
        return NextResponse.json({ ok: true })
      }
      const verified = await mailDestinationVerified(row.mail_forward_to)
      if (verified && !row.mail_verified_at) {
        await c.admin
          .from('custom_domains')
          .update({ mail_verified_at: new Date().toISOString() })
          .eq('id', row.id)
      }
      return NextResponse.json({ ok: verified })
    }

    const mode = String(rawMode ?? '') as MailMode
    if (!MODES.includes(mode)) return NextResponse.json({ error: 'invalid_mode' }, { status: 400 })

    /* ── Riv den gamla uppsättningen ───────────────────────────────────── */
    if (row.mail_mode === 'forward' && mode !== 'forward') {
      await stopForwarding(row.zone_id)
    }
    await clearRecords(row.zone_id, 'MX', domain)
    await clearRecords(row.zone_id, 'TXT', domain)            // SPF
    await clearRecords(row.zone_id, 'TXT', `_dmarc.${domain}`)

    /* ── Skriv den nya ─────────────────────────────────────────────────── */
    const patch: Record<string, unknown> = {
      mail_mode:          mode,
      mail_forward_to:    null,
      mail_verified_at:   null,
      mail_configured_at: new Date().toISOString(),
    }

    if (mode === 'forward') {
      const to = String(forwardTo ?? '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(to)) {
        return NextResponse.json({ error: 'invalid_address' }, { status: 400 })
      }

      /* Cloudflare skriver sina egna MX när routingen slås på; SPF gör den inte,
         och utan den stämplas vidarebefordrad mail som misstänkt. */
      await enableEmailRouting(row.zone_id)
      const dest = await addMailDestination(to)
      await forwardEverything(row.zone_id, to)
      for (const rec of forwardRecords(domain)) await putRecord(row.zone_id, rec)

      patch.mail_forward_to  = to
      patch.mail_verified_at = dest.verified ? new Date().toISOString() : null

      return NextResponse.json({
        ok: true,
        ...(await save(c, row.id, patch)),
        /* Bekräftelsemailet är kundens steg. Sägs det inte här sitter de och
           väntar på en inkorg som aldrig får något. */
        needsConfirm: !dest.verified,
        confirmTo:    to,
      })
    }

    const provider = mailProvider(mode as 'google' | 'microsoft')
    if (provider) {
      for (const rec of provider.records(domain)) await putRecord(row.zone_id, rec)
      return NextResponse.json({
        ok: true,
        ...(await save(c, row.id, patch)),
        signup: provider.signup,
        dkim:   provider.dkim,
      })
    }

    /* mode === 'none' — posterna är redan rivna. */
    return NextResponse.json({ ok: true, ...(await save(c, row.id, patch)) })
  } catch (e) {
    if (e instanceof CloudflareError) {
      return NextResponse.json({ error: 'provider', message: e.message, code: e.code }, { status: 502 })
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

async function save(
  c: NonNullable<Awaited<ReturnType<typeof currentCompany>>>,
  id: string,
  patch: Record<string, unknown>,
) {
  const { error } = await c.admin.from('custom_domains').update(patch).eq('id', id)
  return error ? { saved: false } : { saved: true }
}
