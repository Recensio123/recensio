import { NextRequest, NextResponse } from 'next/server'
import { platformAdmin } from '@/lib/admin'
import { sendMail, mailerConfigured, platformFrom } from '@/lib/mailer'
import { sendSms, smsConfigured, smsSender, smsSegments } from '@/lib/smser'

/*
 * Skickar ett riktigt testutskick.
 *
 * Finns för att alternativet är sämre: utan den här knappen är enda sättet att
 * pröva att utskicken fungerar att lägga en påhittad bokning i en riktig
 * kalender, och den bokningen ligger sedan kvar och stökar i statistiken.
 *
 * Skickar på riktigt. Det kostar ett SMS och det ska det göra — ett test som
 * inte når en telefon bevisar ingenting om leveransen, bara om koden.
 *
 * Bara plattformsadmin. En rutt som skickar meddelanden till valfritt nummer
 * är en spammaskin om den står öppen.
 */
export async function POST(req: NextRequest) {
  if (!(await platformAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const b       = await req.json().catch(() => ({}))
  const kanal   = b.kanal === 'sms' ? 'sms' : 'epost'
  const till    = String(b.till ?? '').trim()
  const avsnamn = String(b.avsandare ?? 'Kiterank').trim()

  if (!till) return NextResponse.json({ error: 'saknar_mottagare' }, { status: 400 })

  if (kanal === 'sms') {
    if (!smsConfigured()) {
      return NextResponse.json({
        ok: false,
        skäl: 'SMS_API_USERNAME och SMS_API_PASSWORD saknas i miljön.',
      })
    }

    /* Samma avsändarnamn som en salong skulle få: eget val eller namnet skalat
       till elva tecken utan specialtecken. Testet ska visa det kunden ser. */
    const från = smsSender(avsnamn)
    const text = `Testmeddelande från Kiterank. Avsändaren du ser är "${från}". Kom detta fram fungerar utskicken.`
    const res  = await sendSms({ to: till, from: från, text })

    return NextResponse.json({
      ok:        res.sent,
      skäl:      res.reason,
      avsandare: från,
      segment:   smsSegments(text),
      tecken:    text.length,
    })
  }

  if (!mailerConfigured()) {
    return NextResponse.json({
      ok: false,
      skäl: 'RESEND_API_KEY saknas i miljön.',
    })
  }
  if (!platformFrom()) {
    return NextResponse.json({
      ok: false,
      skäl: 'MAIL_FROM saknas i miljön — avsändaren måste ligga på en domän som är verifierad hos Resend.',
    })
  }

  /* Namnet skickas orört. Mejlhuvudet har ingen elvateckensgräns och inget
     krav på ren latin — "Salong Nordström & Co" står som den stavas, vilket är
     hela skillnaden mot SMS. Citering av tecken som bryter huvudet gör
     sendMail. */
  const res = await sendMail({
    to:      till,
    from:    { email: platformFrom(), name: avsnamn },
    subject: `Testutskick från ${avsnamn}`,
    text:    `Det här är ett testutskick. Avsändaren du ser i inkorgen är "${avsnamn}" — i skarpt läge står salongens eget namn där. Kom det fram fungerar e-postutskicken.`,
  })

  return NextResponse.json({
    ok:        res.sent,
    skäl:      res.reason,
    id:        res.id,
    avsandare: `${avsnamn} <${platformFrom()}>`,
  })
}
