/*
 * Vem som håller domänen, och var DNS-inställningarna sitter hos dem.
 *
 * Det svåra med att koppla en domän är aldrig posten i sig — det är att hitta
 * rutan där den ska in. En salong har loggat in hos sin domänleverantör en
 * gång, för två år sedan, och möts av en meny på tjugo rader. Så vi läser
 * domänens namnservrar, känner igen leverantören och skriver ut vägen dit i
 * deras egna ord i stället för en allmän instruktion.
 *
 * Känner vi inte igen leverantören visas posten ändå, med en mening om vad man
 * letar efter. Ingen gissning presenteras som ett faktum.
 */

export type Registrar = {
  id:    string
  name:  string
  /** Matchas mot domänens namnservrar, i gemener. */
  match: string[]
  /** Vägen till DNS-inställningarna, som leverantören själv kallar den. */
  path:  string
}

export const REGISTRARS: Registrar[] = [
  {
    id: 'loopia', name: 'Loopia', match: ['loopia'],
    path: 'Logga in på Loopia → Domännamn → välj din domän → DNS-redigerare → Lägg till ny post',
  },
  {
    id: 'one', name: 'one.com', match: ['one.com'],
    path: 'Logga in på one.com → Inställningar → DNS-inställningar → DNS-poster',
  },
  {
    id: 'binero', name: 'Binero', match: ['binero'],
    path: 'Logga in på Binero → Mina domäner → välj din domän → DNS → Lägg till post',
  },
  {
    id: 'inleed', name: 'Inleed', match: ['inleed'],
    path: 'Logga in på Inleed → Domäner → DNS-hantering',
  },
  {
    id: 'oderland', name: 'Oderland', match: ['oderland'],
    path: 'Logga in på Oderland → Domäner → DNS-editor',
  },
  {
    id: 'gandi', name: 'Gandi', match: ['gandi'],
    path: 'Logga in på Gandi → Domains → välj din domän → DNS Records',
  },
  {
    id: 'namecheap', name: 'Namecheap', match: ['namecheap', 'registrar-servers'],
    path: 'Logga in på Namecheap → Domain List → Manage → Advanced DNS',
  },
  {
    id: 'cloudflare', name: 'Cloudflare', match: ['cloudflare'],
    path: 'Logga in på Cloudflare → välj din domän → DNS → Add record',
  },
  {
    id: 'google', name: 'Google Domains eller Squarespace', match: ['googledomains', 'google.com', 'squarespace'],
    path: 'Logga in där domänen ligger → DNS → Egna poster',
  },
  {
    id: 'gopher', name: 'GoDaddy', match: ['godaddy', 'domaincontrol'],
    path: 'Logga in på GoDaddy → Mina produkter → Domäner → DNS → Lägg till',
  },
]

/** Leverantören bakom en uppsättning namnservrar, om vi känner igen någon. */
export function registrarFor(nameservers: string[]): Registrar | null {
  const all = nameservers.join(' ').toLowerCase()
  return REGISTRARS.find(r => r.match.some(m => all.includes(m))) ?? null
}
