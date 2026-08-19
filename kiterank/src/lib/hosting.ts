/*
 * Att lägga till domänen där sidan körs.
 *
 * Utan det här steget pekar DNS rätt men servern vet inte att den ska svara på
 * namnet, och besökaren möts av ett certifikatfel — vilket ser värre ut för
 * salongen än om sidan inte funnits. Certifikatet utfärdas och förnyas av
 * hostingen självt så fort domänen är registrerad där; det är därför det här är
 * ett anrop och inte en hel certifikathantering.
 *
 * Anropet är idempotent: en domän som redan finns i projektet räknas som klar,
 * inte som ett fel. En kund som trycker om knappen ska inte se ett rött fält.
 */

const API = 'https://api.vercel.com'

export function hostingConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim())
}

function team(): string {
  const id = process.env.VERCEL_TEAM_ID?.trim()
  return id ? `?teamId=${id}` : ''
}

export type HostResult = { ok: true } | { ok: false; reason: string }

/** Registrerar domänen hos hostingen så den svarar på namnet och får ett
 *  certifikat. */
export async function addHostDomain(domain: string): Promise<HostResult> {
  if (!hostingConfigured()) return { ok: false, reason: 'not_configured' }

  const project = process.env.VERCEL_PROJECT_ID!.trim()
  const res = await fetch(`${API}/v10/projects/${project}/domains${team()}`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${process.env.VERCEL_TOKEN!.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
    cache: 'no-store',
  })

  if (res.ok) return { ok: true }

  const body = await res.json().catch(() => null) as { error?: { code?: string } } | null
  const code = body?.error?.code ?? ''

  /* Redan tillagd är målet, inte ett fel. */
  if (code === 'domain_already_in_use' || res.status === 409) return { ok: true }

  return { ok: false, reason: code || `http_${res.status}` }
}

export async function removeHostDomain(domain: string): Promise<void> {
  if (!hostingConfigured()) return
  const project = process.env.VERCEL_PROJECT_ID!.trim()
  await fetch(`${API}/v9/projects/${project}/domains/${encodeURIComponent(domain)}${team()}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN!.trim()}` },
    cache:   'no-store',
  }).catch(() => null)
}
