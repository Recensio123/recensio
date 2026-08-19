/*
 * Att skicka ett mail.
 *
 * Ett ställe, ett anrop, en leverantör som kan bytas. Allt annat i koden vet
 * bara att det finns en `sendMail`.
 *
 * HTTP och inte SMTP, för Kiterank körs serverlöst: det finns ingen process som
 * kan hålla en SMTP-anslutning öppen, och port 25 är blockerad hos i stort sett
 * varje molnleverantör. Ett HTTP-anrop passar den formen.
 *
 * Två regler som gäller överallt där den här används:
 *
 *   Den kastar aldrig. Ett mail som inte gick fram får inte fälla det som
 *   utlöste det — en bokning som är skriven i databasen är gjord, även om
 *   bekräftelsen fastnade. Kunden står i salongen på torsdag oavsett.
 *
 *   Utan nycklar skickas ingenting, tyst och med angivet skäl. Under bygget är
 *   det normaltillståndet, och ett kastat fel vid varje bokning hade dolt de
 *   riktiga felen.
 */

export type MailFrom = { email: string; name?: string }

export type Mail = {
  to:       string
  from:     MailFrom
  /** Dit svaret går. Kunden svarar på bekräftelsen och undrar om hon kan flytta
   *  tiden — det svaret måste nå salongen, inte oss. */
  replyTo?: string
  subject:  string
  text:     string
  html?:    string
}

export type MailResult = { sent: boolean; reason?: string; id?: string }

export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

/** Avsändaradressen utskicken går från. Vår egen domän tills salongens är
 *  autentiserad hos sändningstjänsten — ett mail som utger sig för att komma
 *  från en domän vi inte fått rätt att skicka för avvisas eller hamnar i
 *  skräpposten, vilket är värre än att avsändaren är vår. */
export function platformFrom(): string {
  return process.env.MAIL_FROM?.trim() || ''
}

export async function sendMail(mail: Mail): Promise<MailResult> {
  if (!mailerConfigured()) return { sent: false, reason: 'not_configured' }
  if (!mail.from.email)    return { sent: false, reason: 'no_from' }
  if (!mail.to.trim())     return { sent: false, reason: 'no_recipient' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     mail.from.name ? `${quote(mail.from.name)} <${mail.from.email}>` : mail.from.email,
        to:       [mail.to],
        reply_to: mail.replyTo || undefined,
        subject:  mail.subject,
        text:     mail.text,
        html:     mail.html,
      }),
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null) as { message?: string } | null
      return { sent: false, reason: body?.message ?? `http_${res.status}` }
    }

    const body = await res.json().catch(() => null) as { id?: string } | null
    return { sent: true, id: body?.id }
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : 'failed' }
  }
}

/* Ett salongsnamn med citattecken eller kolon i bryter avsändarhuvudet. */
function quote(name: string): string {
  const clean = name.replace(/["\\\r\n]/g, '').trim()
  return /[,:;<>@]/.test(clean) ? `"${clean}"` : clean
}
