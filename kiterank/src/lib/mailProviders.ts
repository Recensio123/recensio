/*
 * Mailposterna, per leverantör.
 *
 * Salongen väljer var mailen ska ligga; posterna som krävs för att den ska
 * fungera skriver vi. Det är inte artigt av oss — det är den del av kopplingen
 * som småföretag alltid får fel, och en felskriven SPF gör att salongens
 * bokningsbekräftelser hamnar i skräpposten hos halva kundregistret.
 *
 * Ett läge i taget. Google, Microsoft och vidarebefordran vill alla tre äga
 * MX-posten på samma domän, så de kan inte kombineras — därför byter vi ut hela
 * uppsättningen vid ett byte i stället för att lägga till i den.
 *
 * Vad vi INTE kan sätta: DKIM. Nyckeln genereras inne i salongens eget
 * Google- eller Microsoft-konto och finns inte förrän de skapat brevlådan. Den
 * får de klistra in efteråt, och tills de gjort det säger panelen det rakt ut i
 * stället för att låta uppsättningen se färdig ut.
 */

import type { DnsRecord } from './cloudflare'

export type MailMode = 'none' | 'forward' | 'google' | 'microsoft'

export type MailProvider = {
  id:      'google' | 'microsoft'
  name:    string
  /** Vad kunden själv måste göra, i deras ord. Vi kan inte köpa brevlådan. */
  signup:  string
  price:   string
  records: (domain: string) => DnsRecord[]
  /** Var DKIM-nyckeln hämtas, när de kommit så långt. */
  dkim:    string
}

/* Microsoft bygger sin MX-adress ur domännamnet: punkter blir bindestreck. */
function msHost(domain: string): string {
  return `${domain.replace(/\./g, '-')}.mail.protection.outlook.com`
}

export const MAIL_PROVIDERS: MailProvider[] = [
  {
    id:     'google',
    name:   'Gmail',
    signup: 'Skapa kontot på workspace.google.com med din domän. Posterna är redan på plats, så verifieringen går igenom direkt.',
    price:  'Från ca 80 kr per brevlåda och månad',
    dkim:   'Google Admin → Appar → Google Workspace → Gmail → Autentisera e-post',
    records: domain => [
      { type: 'MX',  name: domain,             content: 'smtp.google.com',                    priority: 1 },
      { type: 'TXT', name: domain,             content: 'v=spf1 include:_spf.google.com ~all' },
      { type: 'TXT', name: `_dmarc.${domain}`, content: 'v=DMARC1; p=none;' },
    ],
  },
  {
    id:     'microsoft',
    name:   'Outlook',
    signup: 'Skapa kontot på microsoft.com/microsoft-365/business med din domän. Posterna är redan på plats, så verifieringen går igenom direkt.',
    price:  'Från ca 70 kr per brevlåda och månad',
    dkim:   'Microsoft 365 Defender → Policyer → E-postautentisering → DKIM',
    records: domain => [
      { type: 'MX',    name: domain,                     content: msHost(domain), priority: 0 },
      { type: 'TXT',   name: domain,                     content: 'v=spf1 include:spf.protection.outlook.com -all' },
      { type: 'TXT',   name: `_dmarc.${domain}`,         content: 'v=DMARC1; p=none;' },
      { type: 'CNAME', name: `autodiscover.${domain}`,   content: 'autodiscover.outlook.com' },
    ],
  },
]

export function mailProvider(mode: MailMode): MailProvider | null {
  return MAIL_PROVIDERS.find(p => p.id === mode) ?? null
}

/* Posterna vidarebefordran behöver skriver Cloudflare själv när routingen slås
   på, men SPF gör den inte — och utan den stämplas salongens vidarebefordrade
   mail som misstänkt av mottagaren. */
export function forwardRecords(domain: string): DnsRecord[] {
  return [
    { type: 'TXT', name: domain,             content: 'v=spf1 include:_spf.mx.cloudflare.net ~all' },
    { type: 'TXT', name: `_dmarc.${domain}`, content: 'v=DMARC1; p=none;' },
  ]
}
