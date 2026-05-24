import { normalizeSwedishPhone } from './phone'

interface SendSmsOptions {
  to: string
  message: string
  from?: string
  deliveryWebhook?: string
  username?: string
  password?: string
}

export async function sendSms({
  to,
  message,
  from = 'Recensio',
  deliveryWebhook,
  username,
  password,
}: SendSmsOptions) {
  const u = username || process.env.ELKS_USERNAME!
  const p = password || process.env.ELKS_PASSWORD!

  const body = new URLSearchParams({
    from,
    to: normalizeSwedishPhone(to),
    message,
  })
  if (deliveryWebhook) body.set('whendelivered', deliveryWebhook)

  const res = await fetch('https://api.46elks.com/a1/sms', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64') },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`46elks error ${res.status}: ${text}`)
  }

  return res.json() as Promise<{ id: string; status: string }>
}

export function renderTemplate(
  template: string,
  customer: { name: string },
  company: { name: string },
  token?: string
): string {
  const firstName = customer.name.split(' ')[0]
  return template
    .replace(/\{förnamn\}/g, firstName)
    .replace(/\{företag\}/g, company.name)
    .replace(/\{kod\}/g, token ?? '')
    .replace(/\{token\}/g, token ?? '')
}
