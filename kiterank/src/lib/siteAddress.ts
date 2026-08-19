import type { createAdminClient } from '@/lib/supabase/admin'

/*
 * Salongens adress hos oss — kiterank.se/s/<adress>.
 *
 * Två salonger kan heta likadant. Det finns en Studio, en Salong Nord och en
 * Hårstudion i varje stad, så kollisionen är inte ett undantag utan det normala
 * efter ett tag. Tidigare löstes den genom att säga nej i sista steget av
 * onboardingen: kunden fyllde i allt, tryckte klar, och möttes av "adressen är
 * redan tagen" utan besked om vad de skulle välja i stället.
 *
 * Nu löses den innan kunden ser den, i den här ordningen:
 *
 *   studio-soder              om den är ledig
 *   studio-soder-sodermalm    orten de själva angav
 *   studio-soder-sodermalm-2  siffra, som sista utväg
 *
 * Orten före siffran av två skäl. Den är begriplig — kunden känner igen sin
 * adress i stället för att undra vad tvåan betyder. Och den är rätt ord: en
 * lokal salong söks på "frisör + ort", så orten hör hemma i adressen.
 *
 * Adressen är ändå tillfällig och noindexad. Den slutar spela roll den dag
 * salongen kopplar sin egen domän, och det är därför den inte är värd att
 * välja — bara värd att fungera.
 */

/** Ett namn till något som får stå i en adress. */
export function tillAdress(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/** "Södermalm, Stockholm" → "sodermalm". Kunden skriver ofta både och. */
function ortDel(ort: string): string {
  return tillAdress(ort.split(',')[0] ?? '')
}

const MINSTA = 3

/**
 * Första lediga adressen, given salongens namn och ort.
 *
 * Frågar databasen för varje kandidat i tur och ordning. Listan är kort och
 * uppslagen sker en gång per salong, i onboardingen — inte i något som körs
 * ofta.
 *
 * `undantag` är företagets eget id vid ett byte: en salong ska inte blockeras
 * av sin egen nuvarande adress.
 */
export async function ledigAdress(
  admin: ReturnType<typeof createAdminClient>,
  namn: string,
  ort?: string | null,
  undantag?: string,
): Promise<string> {
  const bas = tillAdress(namn) || 'salong'
  const o   = ortDel(ort ?? '')

  const kandidater = [
    bas,
    ...(o && !bas.endsWith(o) ? [`${bas}-${o}`] : []),
  ]
  /* Siffrorna hänger på den längsta kandidaten — har vi en ort vill vi behålla
     den, för "studio-soder-sodermalm-2" säger mer än "studio-soder-2". */
  const stam = kandidater[kandidater.length - 1]
  for (let n = 2; n <= 40; n++) kandidater.push(`${stam}-${n}`)

  for (const kandidat of kandidater) {
    if (kandidat.length < MINSTA) continue
    if (await ledig(admin, kandidat, undantag)) return kandidat
  }

  /* Fyrtio salonger med samma namn på samma ort är inte ett läge som uppstår,
     men en adress måste alltid falla ut — annars fastnar kunden i onboardingen
     med allt ifyllt. */
  return `${stam}-${Date.now().toString(36).slice(-4)}`
}

async function ledig(
  admin: ReturnType<typeof createAdminClient>,
  adress: string,
  undantag?: string,
): Promise<boolean> {
  const q = admin.from('companies').select('id').eq('slug', adress).limit(1)
  const { data } = undantag ? await q.neq('id', undantag) : await q
  if (data?.length) return false

  /* En adress någon lämnat bakom sig skickar fortfarande vidare till dem. Ger
     vi bort den slutar de gamla länkarna peka rätt och börjar peka på någon
     annans salong — värre än att inte fungera alls. */
  try {
    const { data: gamla } = await admin
      .from('companies')
      .select('id')
      .contains('old_slugs', [adress])
      .limit(1)
    if (gamla?.length) return false
  } catch { /* old_slugs inte migrerad — då finns inga gamla adresser än */ }

  return true
}
