import { createAdminClient } from '@/lib/supabase/admin'
import { smsDennaMånad } from '@/lib/utskickslogg'
import { fetchTemplates } from '@/lib/messageTemplates'
import { smsUiUnlocked, smsSender, SMS_MAX } from '@/lib/smser'
import { svarsInfo, kortAvboka, kortOmdome } from '@/lib/mailParties'
import { läsKontaktsätt } from '@/lib/kontaktsatt'
import { ramText } from '@/lib/meddelandeRam'
import { EXEMPEL } from '@/lib/bookingText'

type Admin = ReturnType<typeof createAdminClient>

/** Allt meddelandefliken visar. Namngiven så att panelen kan ta emot den utan
 *  att importera serverkoden som bygger den. */
export type MeddelandeData = Awaited<ReturnType<typeof meddelandeData>>

export async function meddelandeData(admin: Admin, id: string) {

  const [rows, co, site, dom, sms] = await Promise.all([
    fetchTemplates(admin, id),
    admin.from('companies')
      .select('review_url, slug, name, sms_sender, contact_phone, contact_channel')
      .eq('id', id).maybeSingle(),
    admin.from('site_config').select('content').eq('company_id', id).maybeSingle(),
    admin.from('custom_domains').select('domain')
      .eq('company_id', id).eq('is_primary', true).not('verified_at', 'is', null).maybeSingle(),
    smsDennaMånad(admin, id),
  ])

  const c       = co.error   ? null : co.data
  const innehåll = (site.error ? null : site.data?.content) as { phone?: string; businessName?: string } | null

  /* Salongens egen adress när domänen är verifierad, annars vår. Samma regel
     som salonOrigin, men på en rad vi redan läst. */
  const egen   = dom.error ? null : (dom.data?.domain ? `https://${dom.data.domain}` : null)
  const origin = egen ?? (process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || null)

  const reviewUrl = (c?.review_url as string | null) ?? null
  const slug      = (c?.slug as string | null) ?? null
  const namn      = (c?.name as string | null) ?? ''
  const avsändare = (c?.sms_sender as string | null) ?? ''
  const channel   = läsKontaktsätt(c?.contact_channel)

  /* Eget val först, hemsidans värde sedan — för både numret och namnet. */
  const egetTel    = ((c?.contact_phone as string | null) ?? '').trim()
  const sidnummer  = innehåll?.phone?.trim() ?? ''
  const telAnvänds = egetTel || sidnummer
  const sidnamn    = innehåll?.businessName?.trim() ?? ''

  /* Länken som faktiskt hamnar i meddelandet: genvägen på salongens egen adress
     när den finns, annars Google-länken rakt av. */
  const reviewLink = kortOmdome(origin, slug, reviewUrl, egen)

  /* Vad som läggs till varje SMS vid sändning, och alltså tär på de 160
     tecknen. Länken byggs med en exempelkod och inte som ett längdmått: samma
     sträng visas i förhandsvisningen, och ett mått går inte att läsa. */
  const avbokaLänk = kortAvboka(origin, 'a1b2c3d4e5f6a7b8')
  const avboka     = avbokaLänk ? `Din bokning: ${avbokaLänk}` : ''
  const bokning     = svarsInfo(telAnvänds, 'bokning', Boolean(avboka)).sms
  const bokningUtan = svarsInfo(telAnvänds, 'bokning', false).sms
  const omdomeSms   = svarsInfo(telAnvänds, 'omdome').sms

  const smsExtra: Record<string, string> = {
    confirmation: [avboka, bokning].filter(Boolean).join(' '),
    cancellation: bokningUtan,
    reminder:     [avboka, bokning].filter(Boolean).join(' '),
    /* Omdömeslänken ligger i texten och räknas via sin platshållare. */
    review:       omdomeSms,
  }

  /* Raderna mailet lägger under salongens text, i utskickets egen ordning:
     sammanställningen först, sedan länken, sist raden om att svar inte går
     fram. */
  const v = {
    behandling:  EXEMPEL.behandling,
    datum:       EXEMPEL.datum,
    tid:         EXEMPEL.tid,
    medarbetare: EXEMPEL.medarbetare,
    referens:    EXEMPEL.referens,
  }
  const svarMail   = svarsInfo(telAnvänds).text
  const omdomeMail = svarsInfo(telAnvänds, 'omdome').text

  const mailRam: Record<string, string[]> = {
    confirmation: [
      ...ramText('confirmation', v),
      ...(origin ? [`Behöver du avboka eller ändra tiden: ${origin}/…`] : []),
      svarMail,
    ],
    cancellation: [
      ...ramText('cancellation', v),
      ...(origin ? [`Boka en ny tid: ${origin}`] : []),
      svarMail,
    ],
    reminder: [
      ...ramText('reminder', v),
      ...(origin ? [`Behöver du avboka eller ändra tiden: ${origin}/…`] : []),
      svarMail,
    ],
    review: [omdomeMail],
  }

  return {
    templates: rows,
    reviewUrl,
    /* Om kanalen går att ställa in. Under bygget är gränssnittet öppet innan
       leverantören är kopplad. */
    smsReady:  smsUiUnlocked(),
    smsExtra,
    mailRam,
    smsMax:    SMS_MAX,
    reviewLink,
    channel,
    /* Avsändarnamnet: salongens eget val, och det som gäller när de inte gjort
       något — namnet på hemsidan, skalat till elva tecken. */
    smsSenderOwn:  avsändare,
    smsSenderUsed: smsSender(sidnamn || namn, avsändare),
    phoneOwn:      egetTel,
    phoneUsed:     telAnvänds,
    /* Vad som gått ut hittills i månaden. Salongen betalar per SMS, och
       siffran är enda sättet att veta om påminnelserna är värda vad de
       kostar. */
    smsMånad:      sms,
  }
}
