'use client'
import { useCallback, useEffect, useState } from 'react'
import { F, inputStyle } from './fields'
import { helpTxt, labelTxt, Btn, Notis } from './domanUI'
import { MAIL_PROVIDERS } from '@/lib/mailProviders'
import type { MailMode } from '@/lib/mailProviders'
import type { DomainRow } from './domanTypes'

/*
 * Mail på salongens egen domän.
 *
 * Tre vägar, och de kostar olika mycket — därför står priset i valet och inte i
 * ett efterspel. Vidarebefordran är gratis och räcker för de flesta enmans-
 * salonger: post@salongen.se landar i den inkorg de redan läser. Vill de ha en
 * riktig brevlåda i Gmail eller Outlook sätter vi alla poster, men kontot köper
 * de själva — Google och Microsoft säljs bara vidare av godkända partners, och
 * att låta valet se ut som något vi kan ordna vore att lova för mycket.
 *
 * Ett läge i taget, aldrig två. Alla vill äga MX-posten, och två samtidigt är
 * mail som ibland kommer fram.
 */

const VAL: { mode: MailMode; namn: string; pris: string; om: string }[] = [
  {
    mode: 'forward', namn: 'Vidarebefordran', pris: 'Ingen kostnad',
    om: 'Allt till din domän landar i en inkorg du redan har. Du behöver ingen ny brevlåda.',
  },
  {
    mode: 'google', namn: 'Gmail', pris: MAIL_PROVIDERS[0].price,
    om: 'Egen brevlåda i Gmail. Vi sätter alla poster; kontot skapar du hos Google.',
  },
  {
    mode: 'microsoft', namn: 'Outlook', pris: MAIL_PROVIDERS[1].price,
    om: 'Egen brevlåda i Outlook. Vi sätter alla poster; kontot skapar du hos Microsoft.',
  },
]

export function DomanMail({ row, onChange }: { row: DomainRow; onChange: () => void }) {
  const [val,    setVal]    = useState<MailMode>(row.mail_mode)
  const [adress, setAdress] = useState(row.mail_forward_to ?? '')
  const [busy,   setBusy]   = useState(false)
  const [fel,    setFel]    = useState('')
  const [svar,   setSvar]   = useState<{ needsConfirm?: boolean; signup?: string; dkim?: string } | null>(null)

  const aktivt  = row.mail_mode !== 'none'
  const väntar  = row.mail_mode === 'forward' && !row.mail_verified_at

  async function spara(mode: MailMode) {
    setBusy(true); setFel(''); setSvar(null)
    try {
      const res  = await fetch('/api/domains/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: row.domain, mode, forwardTo: adress }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) {
        setFel(
          data.error === 'invalid_address' ? T.badAddress
          : data.error === 'no_zone'       ? T.needZone
          : data.message                   || T.failed,
        )
        return
      }
      setSvar(data)
      onChange()
    } finally {
      setBusy(false)
    }
  }

  /* Bekräftelsen är kundens steg, i deras egen inkorg. Vi kan bara titta efter
     om den är gjord — och det ska ske av sig själv, inte på en knapp. */
  const kolla = useCallback(async () => {
    const res  = await fetch('/api/domains/mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: row.domain, action: 'check' }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.ok) onChange()
  }, [row.domain, onChange])

  useEffect(() => {
    if (!väntar) return
    void kolla()
    const id = setInterval(() => void kolla(), 20_000)
    return () => clearInterval(id)
  }, [väntar, kolla])

  const provider = MAIL_PROVIDERS.find(p => p.id === row.mail_mode)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={labelTxt}>{T.title}</p>

      {aktivt ? (
        <>
          {row.mail_mode === 'forward' ? (
            väntar ? (
              <Notis tone="warn">
                {T.confirmSent(row.mail_forward_to ?? '')}
              </Notis>
            ) : (
              <Notis tone="ok">{T.forwardLive(row.domain, row.mail_forward_to ?? '')}</Notis>
            )
          ) : (
            <Notis tone="ok">{T.providerLive(provider?.name ?? '')}</Notis>
          )}

          {/* DKIM är det enda vi inte kan sätta: nyckeln finns inne i deras eget
              konto och skapas först när brevlådan finns. Att tiga om det vore
              att låta uppsättningen se färdigare ut än den är. */}
          {provider && (
            <>
              <p style={helpTxt}>{provider.signup}</p>
              <p style={helpTxt}>{T.dkim(provider.dkim)}</p>
            </>
          )}

          <Btn tone="quiet" onClick={() => void spara('none')} disabled={busy}>
            {busy ? T.saving : T.turnOff}
          </Btn>
        </>
      ) : (
        <>
          <p style={helpTxt}>{T.intro}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {VAL.map(v => (
              <button
                key={v.mode}
                onClick={() => setVal(v.mode)}
                style={{
                  textAlign: 'left', fontFamily: F, cursor: 'pointer',
                  background: val === v.mode ? '#1e293b' : 'transparent',
                  border: `1px solid ${val === v.mode ? '#eab308' : '#1e293b'}`,
                  borderRadius: 8, padding: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{v.namn}</span>
                  <span style={{ fontSize: 11, color: v.mode === 'forward' ? '#4ade80' : '#94a3b8' }}>{v.pris}</span>
                </div>
                <p style={{ ...helpTxt, marginTop: 3 }}>{v.om}</p>
              </button>
            ))}
          </div>

          {val === 'forward' && (
            <div>
              <p style={{ ...helpTxt, marginBottom: 5 }}>{T.forwardTo}</p>
              <input
                value={adress}
                onChange={e => { setAdress(e.target.value); setFel('') }}
                placeholder="din.adress@gmail.com"
                style={inputStyle}
              />
            </div>
          )}

          <Btn
            onClick={() => void spara(val)}
            disabled={busy || (val === 'forward' && !adress.trim())}
          >
            {busy ? T.saving : T.save}
          </Btn>

          {fel && <p style={{ ...helpTxt, color: '#f87171' }}>{fel}</p>}
          {svar?.needsConfirm && <Notis tone="warn">{T.confirmSent(adress)}</Notis>}
        </>
      )}
    </div>
  )
}

const T = {
  title:       'Mail på din domän',
  intro:       'Vi sätter alla poster som behövs. Välj hur du vill ha det.',
  forwardTo:   'Vilken inkorg ska mailen till din domän hamna i?',
  save:        'Sätt upp',
  saving:      'Sparar…',
  turnOff:     'Stäng av mailen',

  confirmSent: (to: string) =>
    `Ett mail är skickat till ${to}. Klicka på länken i det, annars kommer ingenting fram. Vi märker när du gjort det.`,
  forwardLive: (domain: string, to: string) =>
    `Klart. All mail till @${domain} landar i ${to}.`,
  providerLive: (namn: string) =>
    `Posterna är satta. ${namn} känner igen din domän direkt när du skapar kontot.`,
  dkim: (var_: string) =>
    `En sak återstår när brevlådan finns: hämta DKIM-nyckeln under ${var_} och hör av dig, så lägger vi in den. Den avgör om din mail hamnar i inkorgen eller skräpposten.`,

  badAddress:  'Skriv en fullständig mailadress, till exempel din.adress@gmail.com',
  needZone:    'Mail kräver att vi sköter din DNS. Byt till namnservrarna först.',
  failed:      'Något gick fel. Försök igen.',
}
