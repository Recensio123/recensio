import { NextResponse } from 'next/server'
import { currentCompany, ownDomainRow } from '@/lib/companyScope'
import { normaliseDomain } from '@/lib/domainTarget'
import { readZone, withoutOldSite } from '@/lib/zoneImport'
import { registrarFor } from '@/lib/registrars'
import { addHostDomain } from '@/lib/hosting'
import {
  cfConfigured, ensureZone, zoneStatus, putRecord, CloudflareError,
} from '@/lib/cloudflare'

/*
 * Namnserverläget: vi håller kundens zon.
 *
 * Tre steg, avsiktligt åtskilda, eftersom mellansteget är det som skyddar
 * kunden:
 *
 *   read     — läs av zonen som den ser ut idag och spara den
 *   delegate — skapa vår zon, återskapa deras poster, lämna ut namnservrarna
 *   status   — är bytet genomfört? lägg då till domänen hos hostingen
 *
 * `delegate` vägrar utan en avläsning. Det är inte en formalitet: hoppar man
 * över den och kunden hade mail på domänen försvinner mailen i samma stund
 * namnservrarna pekar hit. Ordningen är hela säkerheten.
 */

export async function POST(req: Request) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!cfConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const { domain: raw, action } = await req.json()
  const domain = normaliseDomain(String(raw ?? ''))
  const row    = await ownDomainRow(c, domain)
  if (!row) return NextResponse.json({ error: 'unknown_domain' }, { status: 404 })

  try {
    /* ── 1. Läs av den gamla zonen ─────────────────────────────────────── */
    if (action === 'read') {
      const zone = await readZone(domain)

      await c.admin
        .from('custom_domains')
        .update({ imported_zone: zone, imported_at: new Date().toISOString() })
        .eq('id', row.id)

      return NextResponse.json({
        ok:          true,
        hasMail:     zone.hasMail,
        records:     zone.records.length,
        mx:          zone.records.filter(r => r.type === 'MX').map(r => r.content),
        registrar:   registrarFor(zone.nameservers),
      })
    }

    /* ── 2. Skapa vår zon och ta med deras poster ──────────────────────── */
    if (action === 'delegate') {
      if (!row.imported_zone) {
        /* Aldrig utan avläsning. Se filens inledning. */
        return NextResponse.json({ error: 'not_read' }, { status: 409 })
      }

      const site = process.env.DOMAIN_TARGET_CNAME?.trim()
      if (!site) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

      const zone = await ensureZone(domain)

      /* Deras poster först, hemsidan sist. Skulle något gå sönder mitt i är det
         mailen som ska ha hunnit fram, inte startsidan. */
      for (const rec of withoutOldSite(row.imported_zone, domain)) {
        await putRecord(zone.id, rec)
      }

      /* Hemsidan. Cloudflare plattar ut en CNAME på bar domän, så samma värde
         fungerar på båda namnen. Proxyn är av med flit: hostingen måste se
         trafiken själv för att kunna utfärda certifikatet. */
      await putRecord(zone.id, { type: 'CNAME', name: domain,           content: site, proxied: false })
      await putRecord(zone.id, { type: 'CNAME', name: `www.${domain}`,  content: site, proxied: false })

      await c.admin
        .from('custom_domains')
        .update({ mode: 'nameservers', zone_id: zone.id, nameservers: zone.nameservers })
        .eq('id', row.id)

      return NextResponse.json({ ok: true, nameservers: zone.nameservers, status: zone.status })
    }

    /* ── 3. Har bytet gått igenom? ─────────────────────────────────────── */
    if (action === 'status') {
      if (!row.zone_id) return NextResponse.json({ ok: false, status: 'no_zone' })

      const status = await zoneStatus(row.zone_id)
      if (status !== 'active') return NextResponse.json({ ok: false, status })

      /* Aktiv zon betyder att namnservrarna pekar hit. Nu — och inte tidigare —
         kan hostingen ta emot namnet och utfärda certifikatet. */
      const patch: Record<string, unknown> = { verified_at: row.verified_at ?? new Date().toISOString() }

      if (!row.host_added_at) {
        const host = await addHostDomain(domain)
        if (host.ok) patch.host_added_at = new Date().toISOString()
        else return NextResponse.json({ ok: false, status: 'host_failed', reason: host.reason })
      }

      /* Första verifierade domänen blir den kanoniska. */
      if (!row.verified_at) {
        const { data: verified } = await c.admin
          .from('custom_domains')
          .select('id')
          .eq('company_id', c.id)
          .not('verified_at', 'is', null)
        patch.is_primary = !verified?.length
      }

      await c.admin.from('custom_domains').update(patch).eq('id', row.id)
      return NextResponse.json({ ok: true, status: 'active' })
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (e) {
    /* Leverantörens egna fel säger ofta precis vad som är fel — "zonen ägs
       redan av ett annat konto" är inget vi kan gissa oss till härifrån. */
    if (e instanceof CloudflareError) {
      return NextResponse.json({ error: 'provider', message: e.message, code: e.code }, { status: 502 })
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
