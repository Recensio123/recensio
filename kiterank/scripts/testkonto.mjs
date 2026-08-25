import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

/*
 * Skapar — eller tar bort — ett bekräftat konto att gå igenom registreringen med.
 *
 * Registreringen i webbläsaren går via Supabases vanliga signUp, och den vill
 * skicka ett bekräftelsemejl. Den inbyggda mejlservern släpper igenom ett par
 * i timmen, vilket räcker för en riktig kund men inte för att titta på en
 * skärm två gånger. Här skapas kontot med adressen redan bekräftad, så att
 * ingen mejlkö står mellan oss och guiden.
 *
 * Bara för utveckling. Kontot äger inget företag och ingen prenumeration —
 * det är en nyckel till steg 1, ingenting annat.
 *
 *   node scripts/testkonto.mjs skapa <adress> <lösenord>
 *   node scripts/testkonto.mjs radera <adress>
 *
 * Inga hemligheter skrivs ut — bara adressen och svaret från Supabase.
 */

for (const rad of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const url    = process.env.NEXT_PUBLIC_SUPABASE_URL
const nyckel = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !nyckel) {
  console.error('Saknar NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY i .env.local')
  process.exit(1)
}

const admin = createClient(url, nyckel, { auth: { autoRefreshToken: false, persistSession: false } })
const [, , kommando, adress, losenord] = process.argv

/** Letar upp användaren på adress. Admin-API:t har ingen sökning på e-post. */
async function hitta(epost) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) throw new Error(error.message)
  return data.users.find(u => u.email?.toLowerCase() === epost.toLowerCase()) ?? null
}

if (kommando === 'skapa') {
  if (!adress || !losenord) {
    console.error('Ange adress och lösenord: node scripts/testkonto.mjs skapa <adress> <lösenord>')
    process.exit(1)
  }
  const fanns = await hitta(adress)
  if (fanns) {
    /* Finns kontot redan sätts bara lösenordet om — annars står man här och
       gissar vilket lösenord ett tidigare försök använde. */
    const { error } = await admin.auth.admin.updateUserById(fanns.id, {
      password: losenord, email_confirm: true,
    })
    console.log(error ? `Kunde inte uppdatera: ${error.message}` : `Fanns redan, lösenordet är omsatt: ${adress}`)
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: adress, password: losenord, email_confirm: true,
    })
    console.log(error ? `Kunde inte skapa: ${error.message}` : `Konto skapat och bekräftat: ${adress}`)
  }
} else if (kommando === 'radera') {
  if (!adress) {
    console.error('Ange adress: node scripts/testkonto.mjs radera <adress>')
    process.exit(1)
  }
  const u = await hitta(adress)
  if (!u) { console.log(`Ingen användare på ${adress}`); process.exit(0) }
  /* Företaget städas först. En föräldralös companies-rad utan användare syns
     ingenstans i panelen men ligger kvar i admin och i statistiken. */
  const { data: företag } = await admin.from('companies').select('id, slug').eq('user_id', u.id)
  for (const f of företag ?? []) {
    await admin.from('companies').delete().eq('id', f.id)
    console.log(`Företag borttaget: ${f.slug}`)
  }
  const { error } = await admin.auth.admin.deleteUser(u.id)
  console.log(error ? `Kunde inte radera: ${error.message}` : `Konto raderat: ${adress}`)
} else {
  console.log('Användning: node scripts/testkonto.mjs skapa|radera <adress> [lösenord]')
}
