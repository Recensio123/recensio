/*
 * Att läsa av zonen innan vi tar över den.
 *
 * Det här är den farligaste punkten i hela domänkopplingen. Byter kunden
 * namnservrar till oss slutar deras gamla zon gälla i samma stund — och har de
 * mail på domänen försvinner den, mitt i en arbetsdag, utan varning. Det räcker
 * inte att vi hade goda avsikter: mailen är borta och det är vårt fel.
 *
 * Så innan bytet läser vi av vad som faktiskt ligger där och skapar samma poster
 * i den nya zonen. Då är växlingen osynlig: mailen fortsätter till samma
 * leverantör som förut, och det enda som ändras är att hemsidan börjar svara.
 *
 * DNS går inte att lista utifrån — det finns ingen fråga som svarar "alla poster
 * på den här domänen". Vi frågar därför efter de namn som betyder något och är
 * ärliga om resten: en underdomän vi inte gissat på kan vi inte ta med, och det
 * måste stå i panelen innan kunden byter, inte upptäckas efteråt.
 */

import { Resolver } from 'node:dns/promises'
import type { DnsRecord } from './cloudflare'

/* Namnen vi frågar efter. Mailen först, eftersom det är den som gör ont när den
   försvinner. Sedan de web-namn en salong rimligen har. */
const PROBE_A     = ['www', 'mail', 'webmail', 'shop', 'blog', 'm']
const PROBE_CNAME = ['www', 'mail', 'webmail', 'autodiscover', 'shop', 'blog', 'ftp', 'm']
const PROBE_TXT   = ['', '_dmarc', 'google._domainkey', 'selector1._domainkey',
                     'selector2._domainkey', 'default._domainkey', 'k1._domainkey',
                     '_domainkey', 'mail._domainkey']

export type ImportedZone = {
  records: DnsRecord[]
  /** Sant när domänen har mail idag. Avgör om bytet får ske utan en varning. */
  hasMail: boolean
  /** Namnservrarna den ligger på nu, för att kunna känna igen leverantören. */
  nameservers: string[]
}

/* Frågan ställs mot publika resolvers och inte mot systemets, så avläsningen
   inte råkar träffa en cache som redan hunnit se vårt eget svar. */
function resolver(): Resolver {
  const r = new Resolver({ timeout: 4000, tries: 2 })
  r.setServers(['1.1.1.1', '8.8.8.8'])
  return r
}

/** Läser av zonen som den ser ut just nu. Fel på en enskild fråga är normalt —
 *  de flesta namn finns inte — så varje fråga får misslyckas för sig. */
export async function readZone(domain: string): Promise<ImportedZone> {
  const r       = resolver()
  const records: DnsRecord[] = []
  let nameservers: string[]  = []

  const tryIt = async (fn: () => Promise<void>) => { try { await fn() } catch { /* finns inte */ } }

  await tryIt(async () => { nameservers = await r.resolveNs(domain) })

  /* Mailen. Både MX och SPF/DKIM/DMARC, för en MX utan sina TXT-poster ger mail
     som går fram men stämplas som skräp. */
  await tryIt(async () => {
    for (const mx of await r.resolveMx(domain)) {
      records.push({ type: 'MX', name: domain, content: mx.exchange, priority: mx.priority })
    }
  })

  for (const sub of PROBE_TXT) {
    const name = sub ? `${sub}.${domain}` : domain
    await tryIt(async () => {
      for (const chunks of await r.resolveTxt(name)) {
        records.push({ type: 'TXT', name, content: chunks.join('') })
      }
    })
  }

  /* Web. Apex-A hoppas över med flit: den ska peka på oss efter bytet, och att
     ta med den gamla vore att skriva över hela poängen med kopplingen. */
  for (const sub of PROBE_CNAME) {
    const name = `${sub}.${domain}`
    await tryIt(async () => {
      const target = (await r.resolveCname(name))[0]
      if (target) records.push({ type: 'CNAME', name, content: target.replace(/\.$/, '') })
    })
  }

  const haveCname = new Set(records.filter(x => x.type === 'CNAME').map(x => x.name))
  for (const sub of PROBE_A) {
    const name = `${sub}.${domain}`
    if (haveCname.has(name)) continue   // CNAME och A på samma namn är ogiltigt
    await tryIt(async () => {
      for (const ip of await r.resolve4(name)) {
        records.push({ type: 'A', name, content: ip })
      }
    })
  }

  return {
    records,
    hasMail: records.some(x => x.type === 'MX'),
    nameservers,
  }
}

/** www pekas alltid om hit — den ska följa hemsidan, inte ligga kvar hos den
 *  gamla leverantören där den skulle visa deras gamla sida. */
export function withoutOldSite(zone: ImportedZone, domain: string): DnsRecord[] {
  return zone.records.filter(r => r.name !== `www.${domain}`)
}
