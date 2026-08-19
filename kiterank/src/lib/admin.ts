import { createClient } from '@/lib/supabase/server'

/*
 * Vem som driver plattformen.
 *
 * Inte en roll i databasen, utan en lista i miljön: `ADMIN_EMAILS`. Skälet är
 * att en rad i en tabell går att skriva till av den som kommer åt tabellen,
 * medan miljövariabeln bara går att ändra där koden körs. Den som kan ändra
 * den kan ändå redan allt.
 *
 * Listan är komma-separerad och skiftlägesokänslig:
 *   ADMIN_EMAILS=ja.kob@hotmail.com,nagon.annan@kiterank.se
 *
 * Är den tom finns ingen administratör. Det är den säkra riktningen: en
 * glömd variabel ska stänga dörren, inte öppna den för alla.
 */

function tillåtna(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

/** Den inloggades e-post, om den är en av plattformens administratörer. */
export async function platformAdmin(): Promise<string | null> {
  const lista = tillåtna()
  if (!lista.length) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email?.trim().toLowerCase()
  if (!email) return null

  return lista.includes(email) ? email : null
}

/** Är administratörslistan tom? Då är området avstängt, inte trasigt. */
export function adminAvstängt(): boolean {
  return tillåtna().length === 0
}
