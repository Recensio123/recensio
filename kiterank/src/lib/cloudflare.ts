/*
 * DNS-leverantören, bakom en tunn vägg.
 *
 * Allt som rör kundens zon går genom den här filen: skapa zonen, läsa
 * posterna, skriva en post, slå på vidarebefordran. Ingen annan del av koden
 * känner till Cloudflare, så leverantören kan bytas utan att panelen eller
 * API-rutterna rörs.
 *
 * Två regler gäller genomgående. Skrivningar är idempotenta — samma post
 * skriven två gånger ger en post, inte två, för en kund som trycker om en knapp
 * ska inte hamna med dubbla MX. Och `cfConfigured()` styr allt: utan nycklar
 * visar panelen att kopplingen inte är påslagen ännu i stället för att låta ett
 * anrop gå iväg och misslyckas halvvägs genom en domänflytt.
 */

const API = 'https://api.cloudflare.com/client/v4'

export type DnsRecord = {
  id?:       string
  type:      string
  name:      string
  content:   string
  ttl?:      number
  priority?: number
  proxied?:  boolean
}

export type Zone = { id: string; nameservers: string[]; status: string }

export function cfConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim() && process.env.CLOUDFLARE_ACCOUNT_ID?.trim())
}

function accountId(): string {
  return process.env.CLOUDFLARE_ACCOUNT_ID!.trim()
}

/* Ett anrop, ett svar, ett fel. Cloudflare svarar 200 med success: false, så
   statuskoden räcker inte som kontroll — felen ligger i kroppen. */
async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization:  `Bearer ${process.env.CLOUDFLARE_API_TOKEN!.trim()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })

  const body = await res.json().catch(() => null) as
    | { success: boolean; result: T; errors?: { code: number; message: string }[] }
    | null

  if (!body?.success) {
    const first = body?.errors?.[0]
    throw new CloudflareError(first?.message ?? `HTTP ${res.status}`, first?.code)
  }
  return body.result
}

export class CloudflareError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message)
    this.name = 'CloudflareError'
  }
}

/* ── Zonen ──────────────────────────────────────────────────────────────── */

/** Skapar zonen, eller hämtar den om den redan finns hos oss. Namnservrarna i
 *  svaret är de kunden ska skriva in hos sin leverantör. */
export async function ensureZone(domain: string): Promise<Zone> {
  const existing = await cf<{ id: string; name_servers: string[]; status: string }[]>(
    `/zones?name=${encodeURIComponent(domain)}&account.id=${accountId()}`,
  )
  if (existing.length) {
    const z = existing[0]
    return { id: z.id, nameservers: z.name_servers ?? [], status: z.status }
  }

  const z = await cf<{ id: string; name_servers: string[]; status: string }>('/zones', {
    method: 'POST',
    body: JSON.stringify({ name: domain, account: { id: accountId() }, type: 'full' }),
  })
  return { id: z.id, nameservers: z.name_servers ?? [], status: z.status }
}

/** 'pending' tills namnservrarna pekar hit, 'active' när de gör det. Det är den
 *  här statusen som avgör om zonen faktiskt styr domänen. */
export async function zoneStatus(zoneId: string): Promise<string> {
  const z = await cf<{ status: string }>(`/zones/${zoneId}`)
  return z.status
}

/* ── Posterna ───────────────────────────────────────────────────────────── */

/** Skriver posten. Finns den redan med samma typ och namn uppdateras den i
 *  stället för att läggas till — annars skulle en ny MX hamna vid sidan av den
 *  gamla och mailen splittras mellan två leverantörer. */
export async function putRecord(zoneId: string, rec: DnsRecord): Promise<void> {
  const q       = `type=${rec.type}&name=${encodeURIComponent(rec.name)}`
  const matches = await cf<DnsRecord[]>(`/zones/${zoneId}/dns_records?${q}`)
  const body    = JSON.stringify({ ttl: 1, ...rec })

  if (matches.length) {
    await cf(`/zones/${zoneId}/dns_records/${matches[0].id}`, { method: 'PATCH', body })
    /* Fler än en post av samma typ och namn är en tidigare halvkörning. Den
       som blev kvar tas bort, så resultatet är det vi tror att det är. */
    for (const extra of matches.slice(1)) {
      await cf(`/zones/${zoneId}/dns_records/${extra.id}`, { method: 'DELETE' })
    }
    return
  }
  await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body })
}

/** Tar bort varje post av en typ. Används när ett mailäge byts ut mot ett
 *  annat: den gamla leverantörens MX måste bort innan den nyas läggs in. */
export async function clearRecords(zoneId: string, type: string, name?: string): Promise<void> {
  const q    = `type=${type}` + (name ? `&name=${encodeURIComponent(name)}` : '')
  const recs = await cf<DnsRecord[]>(`/zones/${zoneId}/dns_records?${q}`)
  for (const r of recs) {
    await cf(`/zones/${zoneId}/dns_records/${r.id}`, { method: 'DELETE' })
  }
}

/* ── Vidarebefordran ────────────────────────────────────────────────────── */

/*
 * Cloudflares mailvidarebefordran kostar ingenting och kräver ingen brevlåda,
 * men mottagaren måste bekräfta sin adress via ett mail från Cloudflare innan
 * något går fram. Det steget kan vi inte göra åt kunden, så det måste synas i
 * panelen — annars sitter de och undrar varför posten är grön men inkorgen tom.
 */

export async function enableEmailRouting(zoneId: string): Promise<void> {
  await cf(`/zones/${zoneId}/email/routing/enable`, { method: 'POST', body: '{}' })
}

/** Lägger till mottagaradressen och talar om ifall den redan är bekräftad. */
export async function addMailDestination(email: string): Promise<{ verified: boolean }> {
  const list = await cf<{ email: string; verified: string | null }[]>(
    `/accounts/${accountId()}/email/routing/addresses?per_page=100`,
  )
  const found = list.find(a => a.email.toLowerCase() === email.toLowerCase())
  if (found) return { verified: Boolean(found.verified) }

  const made = await cf<{ verified: string | null }>(
    `/accounts/${accountId()}/email/routing/addresses`,
    { method: 'POST', body: JSON.stringify({ email }) },
  )
  return { verified: Boolean(made.verified) }
}

export async function mailDestinationVerified(email: string): Promise<boolean> {
  const list = await cf<{ email: string; verified: string | null }[]>(
    `/accounts/${accountId()}/email/routing/addresses?per_page=100`,
  )
  return Boolean(list.find(a => a.email.toLowerCase() === email.toLowerCase())?.verified)
}

/** Allt till domänen går vidare till en adress. En catch-all i stället för en
 *  regel per adress: salongen ska inte behöva räkna upp vilka adresser de vill
 *  ha, och mail till en felstavad adress ska nå fram ändå. */
export async function forwardEverything(zoneId: string, to: string): Promise<void> {
  await cf(`/zones/${zoneId}/email/routing/rules/catch_all`, {
    method: 'PUT',
    body: JSON.stringify({
      enabled:  true,
      name:     'Allt till salongen',
      matchers: [{ type: 'all' }],
      actions:  [{ type: 'forward', value: [to] }],
    }),
  })
}

export async function stopForwarding(zoneId: string): Promise<void> {
  await cf(`/zones/${zoneId}/email/routing/rules/catch_all`, {
    method: 'PUT',
    body: JSON.stringify({
      enabled:  false,
      name:     'Av',
      matchers: [{ type: 'all' }],
      actions:  [{ type: 'drop' }],
    }),
  })
}
