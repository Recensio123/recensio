import type { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchTemplates, kanalFor, settingsFor, TEMPLATES,
  type TemplateChannel,
} from '@/lib/messageTemplates'
import {
  läsKontaktsätt, golvFor, STANDARD_KONTAKT,
  type Kontaktsätt, type Krav,
} from '@/lib/kontaktsatt'

/*
 * Vad kunden måste fylla i när de bokar.
 *
 * Ligger för sig eftersom svaret behöver båda halvorna: salongens kontaktsätt,
 * som styr bekräftelsen och avbokningen, och mallarna, eftersom påminnelsen och
 * recensionsförfrågan väljer kanal själva. Skulle uträkningen ligga i någon av
 * dem hade de två modulerna importerat varandra.
 *
 * Regeln i en mening: varje kanal som något påslaget meddelande faktiskt
 * använder kräver sin uppgift.
 *
 * Det var en gång en inställning för det här också, där salongen kunde kräva
 * mer än kanalvalet gjorde. Den är borta. Formuläret frågar alltid efter namn,
 * nummer och adress — det är bara vilken av de två sista som är obligatorisk
 * som styrs, och den följer av kanalen. Två reglage för en regel betyder att
 * någon förr eller senare ställer in dem så att de säger emot varandra.
 */

type Admin = ReturnType<typeof createAdminClient>

export async function hämtaKrav(
  admin: Admin, companyId: string,
): Promise<{ kanal: Kontaktsätt; krav: Krav }> {
  const [res, rader] = await Promise.all([
    admin
      .from('companies')
      .select('contact_channel')
      .eq('id', companyId)
      .maybeSingle(),
    fetchTemplates(admin, companyId),
  ])

  /* Kolumnen är en sen migration — utan den gäller standarden i stället för att
     bokningssidan faller. */
  const kanal = res.error ? STANDARD_KONTAKT : läsKontaktsätt(res.data?.contact_channel)

  /* Påminnelsen och recensionsförfrågan går som SMS. Är någon av dem påslagen
     måste numret finnas — annars är den påslagen för alla och når ingen. Ett
     avstängt meddelande kräver ingenting. */
  const används: TemplateChannel[] = []
  for (const t of TEMPLATES) {
    if (!t.ledtid) continue
    const k = kanalFor(t.kind, kanal)
    if (settingsFor(rader, t.kind, k).enabled) används.push(k)
  }

  return { kanal, krav: golvFor(kanal, används) }
}
