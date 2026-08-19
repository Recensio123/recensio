interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // skip silently if not configured

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'Recensio <noreply@recensio.se>',
      to,
      subject,
      html,
    }),
  }).catch(() => {}) // never crash the review flow if email fails
}

export function reviewEmail(opts: {
  customerName: string
  companyName: string
  stars: number
  dashboardUrl: string
}) {
  const { customerName, companyName, stars, dashboardUrl } = opts
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars)
  const subject = `${starStr} Ny recension från ${customerName}`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px;color:#0e1410">Ny recension inkommen</h2>
      <p style="color:#5c5445;margin:0 0 20px">${companyName}</p>
      <div style="background:#f7f3ec;border-radius:12px;padding:16px 20px;margin-bottom:20px">
        <div style="font-size:28px;letter-spacing:2px;margin-bottom:8px">${starStr}</div>
        <div style="font-size:15px;color:#0e1410;font-weight:600">${customerName}</div>
        <div style="font-size:13px;color:#9c9285;margin-top:2px">har skickats vidare för att lämna recension</div>
      </div>
      <a href="${dashboardUrl}" style="display:inline-block;background:#1a3d2b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">Öppna dashboard →</a>
    </div>
  `
  return { subject, html }
}

export function feedbackEmail(opts: {
  customerName: string
  companyName: string
  stars: number
  feedback: string
  dashboardUrl: string
}) {
  const { customerName, companyName, stars, feedback, dashboardUrl } = opts
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars)
  const subject = `💬 Privat feedback från ${customerName}`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 8px;color:#0e1410">Privat feedback inkommen</h2>
      <p style="color:#5c5445;margin:0 0 20px">${companyName}</p>
      <div style="background:#fee2e2;border-radius:12px;padding:16px 20px;margin-bottom:20px">
        <div style="font-size:20px;letter-spacing:2px;margin-bottom:8px">${starStr}</div>
        <div style="font-size:15px;color:#0e1410;font-weight:600">${customerName}</div>
        <div style="font-size:13px;color:#5c5445;margin-top:10px;line-height:1.6;white-space:pre-wrap">${feedback}</div>
      </div>
      <a href="${dashboardUrl}" style="display:inline-block;background:#1a3d2b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">Öppna dashboard →</a>
    </div>
  `
  return { subject, html }
}
