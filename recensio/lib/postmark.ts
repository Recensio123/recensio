import { ServerClient } from 'postmark'

export function getPostmarkClient(token?: string) {
  return new ServerClient(token || process.env.POSTMARK_SERVER_TOKEN!)
}

export async function sendReviewEmail({
  to,
  customerName,
  companyName,
  reviewUrl,
  token,
}: {
  to: string
  customerName: string
  companyName: string
  reviewUrl: string
  token: string
}) {
  const client = getPostmarkClient()
  return client.sendEmail({
    From: `no-reply@recensio.se`,
    To: to,
    Subject: `Hur gick jobbet med ${companyName}?`,
    TextBody: `Hej ${customerName.split(' ')[0]}!\n\nTack för att du anlitade ${companyName}. Vad tyckte du om jobbet?\n\nLämna din recension här (30 sekunder):\n${reviewUrl}/r/${token}\n\nMvh,\n${companyName}`,
    HtmlBody: `<p>Hej ${customerName.split(' ')[0]}!</p><p>Tack för att du anlitade <strong>${companyName}</strong>. Vad tyckte du om jobbet?</p><p><a href="${reviewUrl}/r/${token}">Lämna din recension (30 sekunder)</a></p>`,
    MessageStream: 'outbound',
  })
}
