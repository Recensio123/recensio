/*
 * Vad som håller ihop en person mellan två bokningar.
 *
 * Ligger för sig eftersom två ställen måste svara likadant: kundhistoriken som
 * visar besöken, och gallringen som avgör vems uppgifter som raderas. Glider de
 * isär blir följden inte kosmetisk — historiken kan visa en aktiv stamkund
 * medan gallringen ser två inaktiva och tömmer halva hennes historia.
 *
 * Ordningen är telefon, mejl, namn. Numret följer med en person; mejladresser
 * byts; namn stavas olika. Två som verkligen heter likadant och saknar både
 * nummer och mejl slås ihop — alternativet är att varje bokning blir sin egen
 * kund, vilket gör hela historiken meningslös.
 */

/**
 * Ett svenskt mobilnummer i en jämförbar form.
 *
 * `+46 70 123 45 67` och `070-123 45 67` är samma telefon, men som siffror är
 * de `46701234567` och `0701234567`. Utan det här steget blir en person som
 * bokat en gång från mobilen och en gång från datorn två kunder — och den
 * äldre av dem gallras medan den nyare lever vidare.
 */
export function normaliseraTelefon(rå?: string | null): string {
  const siffror = (rå ?? '').replace(/\D/g, '')
  if (!siffror) return ''
  /* Landsnumret ersätts av den nolla det står i stället för. */
  if (siffror.startsWith('46') && siffror.length >= 10) return '0' + siffror.slice(2)
  if (siffror.startsWith('0046'))                        return '0' + siffror.slice(4)
  return siffror
}

/** Nyckeln en person känns igen på. */
export function kundNyckel(p: { telefon?: string | null; epost?: string | null; namn?: string | null }): string {
  const tel = normaliseraTelefon(p.telefon)
  if (tel.length >= 8) return 'tel:' + tel
  if (p.epost?.trim())  return 'post:' + p.epost.trim().toLowerCase()
  return 'namn:' + (p.namn ?? '').trim().toLowerCase()
}
