/*
 * Ett meddelande, oavsett kanal.
 *
 * Salongen väljer SMS, mail eller båda per meddelandesort. Det valet ska finnas
 * på ett ställe i koden, inte upprepat i varje utskick — annars stödjer
 * bekräftelsen båda kanalerna medan avbokningen glömdes kvar på mail.
 *
 * Tre saker den här filen håller ihop:
 *
 *   Samtycket. SMS får bara gå till en kund som kryssat i det. Kryssrutan finns
 *   i bokningsflödet, och utan den skickas mailet men inte SMS:et — inte båda
 *   eller inget.
 *
 *   Texten per kanal. Ett SMS har ingen ämnesrad och ingen layout: det är
 *   mallen, rakt av, plus länken. Mailet har rubrik, uppgifter och en ram.
 *   Samma mall, två format.
 *
 *   Utfallet. Skickades det på minst en kanal räknas meddelandet som levererat,
 *   och den stämpel som anropade får sättas. Gick allt fel ska det kunna göras
 *   om, så inget stämplas.
 */

import { sendMail, platformFrom, type MailFrom } from './mailer'
import { sendSms, smsSender, smsConfigured } from './smser'

export type Channel = 'email' | 'sms' | 'both'

export type MessageResult = {
  sent:    boolean
  /** Vad som faktiskt hände på varje kanal, för loggen. */
  email?:  { sent: boolean; reason?: string }
  sms?:    { sent: boolean; reason?: string; segments?: number }
  reason?: string
}

export type Message = {
  channel:   Channel
  salong:    string
  /** Kundens uppgifter. Saknas en av dem hoppas den kanalen över. */
  email:     string | null
  phone:     string | null
  /** Kryssade kunden i SMS när de bokade. Utan det: inget SMS. */
  smsOptIn:  boolean

  subject:   string
  /** Mailets brödtext, färdig. */
  text:      string
  html?:     string
  /** SMS-texten. Kortare, utan ram — och utan den skickas inget SMS. */
  sms?:      string
  /** Avsändarnamnet kunden ser. Salongens eget val; utan det skalas
   *  salongsnamnet till samma form. */
  smsFrom?:  string | null
}

export async function sendMessage(m: Message): Promise<MessageResult> {
  const vilkaMail = m.channel === 'email' || m.channel === 'both'
  const vilkaSms  = m.channel === 'sms'   || m.channel === 'both'

  const out: MessageResult = { sent: false }

  if (vilkaMail) {
    const from = platformFrom()
    if (!from) {
      out.email = { sent: false, reason: 'no_from' }
    } else if (!m.email?.trim()) {
      out.email = { sent: false, reason: 'no_email' }
    } else {
      /* Ingen Reply-To. Utskicken är enkelriktade, och det står i mailet — ett
         svarsspår till en inkorg ingen bevakar är sämre än ett tydligt nej.
         Avsändaradressen sätts till en noreply-adress via MAIL_FROM. */
      const avsändare: MailFrom = { email: from, name: m.salong }
      const r = await sendMail({
        to: m.email.trim(), from: avsändare,
        subject: m.subject, text: m.text, html: m.html,
      })
      out.email = { sent: r.sent, reason: r.reason }
    }
  }

  if (vilkaSms) {
    if (!smsConfigured()) {
      out.sms = { sent: false, reason: 'not_configured' }
    } else if (!m.phone?.trim()) {
      out.sms = { sent: false, reason: 'no_phone' }
    } else if (!m.smsOptIn) {
      /* Inget fel — kunden har valt bort SMS, och det valet gäller. */
      out.sms = { sent: false, reason: 'no_consent' }
    } else if (!m.sms?.trim()) {
      out.sms = { sent: false, reason: 'no_text' }
    } else {
      const r = await sendSms({ to: m.phone, from: smsSender(m.salong, m.smsFrom), text: m.sms })
      out.sms = { sent: r.sent, reason: r.reason, segments: r.segments }
    }
  }

  out.sent = Boolean(out.email?.sent || out.sms?.sent)

  if (!out.sent) {
    /* Ett skäl att logga: det första som inte var ett tyst normaltillstånd. */
    out.reason = out.email?.reason ?? out.sms?.reason ?? 'nothing_to_send'
  }

  return out
}

/** Skälen som inte är fel. Delas av varje anropare, så samma tystnad gäller
 *  överallt. */
export const TYSTA_SKÄL = [
  'no_email', 'no_phone', 'no_consent', 'no_from', 'not_configured',
  'nothing_to_send', 'no_text',
  'already_sent', 'not_confirmed', 'not_cancelled', 'not_needed',
  'no_salon_address', 'disabled',
]
