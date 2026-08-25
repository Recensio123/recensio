import type { createAdminClient } from '@/lib/supabase/admin'
import { sendMessage, type Message, type MessageResult } from '@/lib/sendMessage'
import { rapporteraSms } from '@/lib/betalning'

/*
 * Räkningen av vad som gått ut.
 *
 * Finns för att SMS kostar per segment och mejl inte gör det. En salong som ska
 * bedöma om påminnelser är värda pengarna behöver ett tal, och det talet får
 * inte vara en gissning ur bokningarnas stämplar — de säger inte vilken kanal
 * som användes, bara att något skickades.
 *
 * Loggningen sker efter sändningen och bara på det som faktiskt gick iväg. Ett
 * SMS som stoppades för att kunden saknade nummer har inte kostat något och ska
 * inte räknas.
 *
 * Ett fel i loggen får aldrig stoppa ett utskick. Kunden som väntar på sin
 * bokningsbekräftelse bryr sig inte om vår statistik.
 */

type Admin = ReturnType<typeof createAdminClient>

export type UtskickKind = 'confirmation' | 'cancellation' | 'reminder' | 'review'

/** Skickar, och skriver upp det som gick. */
export async function skickaOchLogga(
  admin: Admin,
  om: { companyId: string; bookingId?: string | null; kind: UtskickKind },
  m: Message,
): Promise<MessageResult> {
  const svar = await sendMessage(m)

  const rader: Record<string, unknown>[] = []
  if (svar.email?.sent) {
    rader.push({
      company_id: om.companyId, booking_id: om.bookingId ?? null,
      kind: om.kind, channel: 'email', segments: 0,
    })
  }
  if (svar.sms?.sent) {
    rader.push({
      company_id: om.companyId, booking_id: om.bookingId ?? null,
      kind: om.kind, channel: 'sms', segments: svar.sms.segments ?? 1,
    })
  }

  if (rader.length) {
    try {
      const { data: skrivna } = await admin
        .from('message_events').insert(rader).select('id, channel')

      /*
       * Debiteringen hängs på loggraden, inte på sändningen.
       *
       * Radens id blir identifieraren mot Stripes mätare, vilket ger två saker
       * gratis: ett omförsök kan aldrig debitera samma meddelande två gånger,
       * och varje krona på fakturan går att spåra tillbaka till exakt vilket
       * utskick den kom ifrån den dag en kund undrar.
       *
       * Mejl kostar ingenting och rapporteras inte.
       */
      const sms = (skrivna ?? []).filter(r => r.channel === 'sms')
      if (sms.length) await debitera(admin, om.companyId, sms.map(r => String(r.id)))
    } catch { /* migrationen inte körd, eller databasen tillfälligt otillgänglig */ }
  }

  return svar
}

/** Skickar förbrukningen vidare till Stripe. Tyst när kunden inte finns där. */
async function debitera(admin: Admin, companyId: string, radId: string[]): Promise<void> {
  try {
    const { data } = await admin
      .from('companies').select('stripe_customer_id').eq('id', companyId).maybeSingle()
    const kund = data?.stripe_customer_id as string | null
    /* Ingen Stripe-kund: kontot är på prov eller från byggtiden. Loggraden
       finns kvar, så inget underlag går förlorat — det finns bara ingen
       faktura att lägga det på än. */
    if (!kund) return

    await Promise.all(radId.map(id => rapporteraSms(kund, id)))
  } catch { /* debitering får aldrig störa ett utskick */ }
}

export type SmsRäkning = {
  /** Antal skickade SMS den här månaden. */
  antal:    number
  /** Antal segment, alltså det som faktiskt kostar. Ett SMS över 160 tecken är
   *  flera segment. */
  segment:  number
  /** Månaden räkningen gäller, som ISO-datum för dess första dag. */
  från:     string
}

/**
 * SMS skickade sedan månadsskiftet.
 *
 * Kalendermånad och inte trettio dagar bakåt: en salong som undrar vad
 * tjänsten kostar tänker i månader, och ett rullande fönster går inte att
 * stämma av mot en faktura.
 */
export async function smsDennaMånad(
  admin: Admin, companyId: string, nu = new Date(),
): Promise<SmsRäkning> {
  const från = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), 1))
  const tom: SmsRäkning = { antal: 0, segment: 0, från: från.toISOString().slice(0, 10) }

  const { data, error } = await admin
    .from('message_events')
    .select('segments')
    .eq('company_id', companyId)
    .eq('channel', 'sms')
    .gte('sent_at', från.toISOString())
    .limit(10_000)

  /* Migrationen inte körd: noll, inte ett fel. Panelen ska rita sig ändå. */
  if (error || !data) return tom

  return {
    ...tom,
    antal:   data.length,
    segment: data.reduce((s, r) => s + Number(r.segments ?? 1), 0),
  }
}
