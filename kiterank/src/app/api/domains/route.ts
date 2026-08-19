import { NextResponse } from 'next/server'
import { normaliseDomain, domainLooksValid } from '@/lib/domainTarget'
import { clearSiteCache, clearSiteAddress } from '@/app/s/[slug]/site-data'
import { currentCompany } from '@/lib/companyScope'
import { cfConfigured } from '@/lib/cloudflare'
import { removeHostDomain } from '@/lib/hosting'

/*
 * The salon's own domain: list, add, remove.
 *
 * Adding a row proves nothing — anyone can type a domain into a box. Control is
 * proven by the nameserver swap in /api/domains/zone, and until that has gone
 * through the row exists but is never served: the published site keeps
 * answering on the temporary address, and nothing about the salon's search
 * presence changes. It is the same reason a domain cannot be claimed twice —
 * the first salon to verify owns it.
 */

export async function GET() {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await c.admin
    .from('custom_domains')
    .select('domain, verified_at, is_primary, mode, nameservers, imported_zone, imported_at, ' +
            'mail_mode, mail_forward_to, mail_verified_at')
    .eq('company_id', c.id)
    .order('created_at')

  /* Zonläget visas bara när leverantören faktiskt är uppsatt. Annars vore det
     ett val kunden kan göra som inte leder någonstans. */
  return NextResponse.json({
    domains: data ?? [],
    zones:   cfConfigured(),
  })
}

export async function POST(req: Request) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { domain: raw } = await req.json()
  const domain = normaliseDomain(String(raw ?? ''))

  if (!domainLooksValid(domain)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  /* ── Add ──────────────────────────────────────────────────────────────── */
  const { error } = await c.admin
    .from('custom_domains')
    .insert({ company_id: c.id, domain })

  if (error) {
    /* The unique index is what stops one salon from claiming another's
       domain, so a collision is expected traffic rather than a fault. */
    const taken = error.code === '23505'
    return NextResponse.json({ error: taken ? 'taken' : 'save_failed' }, { status: taken ? 409 : 500 })
  }

  return NextResponse.json({ ok: true, domain })
}

export async function DELETE(req: Request) {
  const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const domain = normaliseDomain(new URL(req.url).searchParams.get('domain') ?? '')
  if (!domain) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  /* Scoped to the company, so a request cannot reach anyone else's row. */
  const { data: row } = await c.admin
    .from('custom_domains')
    .select('id, host_added_at')
    .eq('company_id', c.id)
    .eq('domain', domain)
    .single()

  if (!row) return NextResponse.json({ ok: true })

  /* Namnet släpps hos hostingen också, annars kan ingen annan lägga till det —
     inte ens kunden själv om de kommer tillbaka. Zonen lämnas orörd med flit:
     ligger deras mail i den släcker en radering den. */
  if (row.host_added_at) await removeHostDomain(domain)

  await c.admin.from('custom_domains').delete().eq('id', row.id)

  /* Samma sak baklänges: adressen slutar svara och /s/ slutar skicka vidare. */
  clearSiteAddress(domain)
  clearSiteCache(c.id)
  return NextResponse.json({ ok: true })
}
