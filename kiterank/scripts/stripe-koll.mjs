import Stripe from 'stripe'
import { readFileSync } from 'node:fs'

/*
 * Kontrollerar att Stripe innehåller det paketmodellen förväntar sig.
 *
 * Koden känner inga belopp och inga pris-id:n — bara etiketter (lookup_key).
 * Den här listar vad som finns bakom varje etikett och vad som saknas, så att
 * ett glömt pris upptäcks här och inte i en kunds kassa.
 *
 * Inga hemligheter skrivs ut — bara namn, belopp och svaret från Stripe.
 *
 *   npm run stripe:koll
 */

/* .env.local läses för hand: Next laddar den åt sidorna, men ett vanligt
   nodskript får ingenting gratis. */
for (const rad of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = rad.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const bock = '  ✓', kryss = '  ✗', varning = '  !'

const PLANER = [
  ['mall',        'Hemsida + marknadsföringsplattform'],
  ['design',      'Designad hemsida + marknadsföringsplattform'],
  ['fullservice', 'Full service'],
]
const INTERVALL = [['manad', 'month'], ['ar', 'year']]

const nyckel = process.env.STRIPE_SECRET_KEY?.trim()
if (!nyckel) {
  console.log(`${kryss} STRIPE_SECRET_KEY är tom — klistra in den från Stripe → Developers → API keys`)
  process.exit(1)
}

const läge = nyckel.startsWith('sk_live_') ? 'live' : nyckel.startsWith('sk_test_') ? 'test' : null
if (!läge) {
  console.log(`${kryss} STRIPE_SECRET_KEY ser inte ut som en hemlig nyckel (ska börja med sk_test_ eller sk_live_)`)
  process.exit(1)
}

const stripe = new Stripe(nyckel)

console.log(`\nStripe-koll — ${läge === 'live' ? 'SKARPT LÄGE (riktiga pengar)' : 'sandbox/testläge'}\n`)

try {
  const konto = await stripe.accounts.retrieveCurrent()
  console.log(`${bock} Nyckeln fungerar — konto: ${konto.business_profile?.name || konto.settings?.dashboard?.display_name || konto.id}`)
  if (läge === 'live' && !konto.charges_enabled) {
    console.log(`${varning} Kontot kan inte ta emot betalningar än — Stripe vill ha fler uppgifter först`)
  }
} catch (e) {
  console.log(`${kryss} Nyckeln avvisades av Stripe: ${e.message}`)
  process.exit(1)
}

/* Hela katalogen i ett anrop och indexera på etikett — samma sätt som
   appen läser den. */
const katalog = new Map()
for await (const p of stripe.prices.list({ active: true, limit: 100, expand: ['data.product'] })) {
  if (p.lookup_key) katalog.set(p.lookup_key, p)
}

const kr = p => p.unit_amount != null
  ? `${(p.unit_amount / 100).toLocaleString('sv-SE')} ${p.currency.toUpperCase()}`
  : 'förbrukning'

let saknas = 0, fel = 0

/* väntatIntervall: 'month' | 'year' för löpande priser, null för engångspris,
   och 'valfritt' när priset får saknas utan att det är ett fel. */
function kolla(etikett, vad, väntatIntervall, frivilligt = false) {
  const p = katalog.get(etikett)
  if (!p) {
    console.log(`${frivilligt ? '  ·' : varning} ${etikett.padEnd(28)} ${frivilligt ? 'ingen' : 'saknas'} — ${vad}`)
    if (!frivilligt) saknas++
    return
  }

  const faktiskt = p.recurring?.interval
  console.log(`${bock} ${etikett.padEnd(28)} ${kr(p)} / ${faktiskt ?? 'engångs'}   ${p.product?.name ?? ''}`)

  if (väntatIntervall === null && faktiskt) {
    console.log(`${kryss}   ska vara ett engångspris (One-off), inte ${faktiskt}`)
    fel++
  } else if (väntatIntervall && faktiskt !== väntatIntervall) {
    console.log(`${kryss}   intervallet är ${faktiskt ?? 'engångs'}, ska vara ${väntatIntervall}`)
    fel++
  }
}

console.log('\nPaket')
for (const [plan, namn] of PLANER) {
  for (const [i, stripeI] of INTERVALL) kolla(`${plan}_${i}`, `${namn}, ${i === 'ar' ? 'årsvis' : 'månadsvis'}`, stripeI)
}

console.log('\nBokningstillägg')
for (const [plan, namn] of PLANER) {
  for (const [i, stripeI] of INTERVALL) kolla(`bokning_${plan}_${i}`, `bokning för ${namn}, ${i === 'ar' ? 'årsvis' : 'månadsvis'}`, stripeI)
}

/* Uppstartsavgiften är frivillig per rad: saknas etiketten är avgiften noll,
   vilket är precis hur årsbetalning ska se ut. */
console.log('\nUppstartsavgift (engångspris — saknad etikett betyder ingen avgift)')
for (const [plan, namn] of PLANER) {
  for (const [i] of INTERVALL) {
    kolla(`uppstart_${plan}_${i}`, `uppstart för ${namn}, ${i === 'ar' ? 'årsvis' : 'månadsvis'}`, null, true)
  }
}

console.log('\nFörbrukning')
kolla('sms', 'SMS, 1 kr per skickat meddelande', 'month')

const okända = [...katalog.keys()].filter(k =>
  k !== 'sms' && !/^(bokning_|uppstart_)?(mall|design|fullservice)_(manad|ar)$/.test(k))
if (okända.length) {
  console.log(`\n${varning} Etiketter i Stripe som modellen inte känner igen: ${okända.join(', ')}`)
}

console.log('')
const hook = process.env.STRIPE_WEBHOOK_SECRET?.trim()
console.log(hook?.startsWith('whsec_')
  ? `${bock} STRIPE_WEBHOOK_SECRET är ifylld`
  : `${varning} STRIPE_WEBHOOK_SECRET är tom — den skapas när webhooken registreras vid deploy`)

console.log(fel
  ? `\n${fel} pris har fel intervall och måste rättas.\n`
  : saknas
    ? `\n${saknas} pris saknas. Paket utan pris går inte att köpa — nivåer du tänkt sälja på offert kan lämnas tomma med flit.\n`
    : '\nAllt på plats.\n')
process.exit(fel ? 1 : 0)
