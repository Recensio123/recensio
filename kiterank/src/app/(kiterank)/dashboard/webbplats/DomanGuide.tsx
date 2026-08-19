'use client'
import { useState } from 'react'
import { F } from './fields'
import { helpTxt, Btn, Notis, netimSök } from './domanUI'

/*
 * Att köpa en domän, steg för steg.
 *
 * Det här är enda stället i produkten där vi skickar kunden till någon annans
 * kassa. De lämnar ett flöde de känner igen och landar hos en fransk
 * domänhandlare med engelska rubriker, moms som kan slås av, och ett
 * SSL-certifikat till salu som de redan har. Utan hjälp är det där folk
 * antingen köper fel eller inte köper alls.
 *
 * Guiden beskriver skärmar som faktiskt finns — inte hur ett domänköp brukar
 * gå till. Gissade menyval får en salong att leta efter en flik som inte
 * existerar och tro att felet är deras.
 *
 * Stegen slutar när domänen är köpt. Att koppla den sköter rutan ovanför;
 * den vet redan vilka namnservrar som gäller och kontrollerar själv när bytet
 * gått igenom.
 */

export function DomanGuide({ namn }: { namn?: string }) {
  const [öppen, setÖppen] = useState(false)
  const länk = netimSök(namn)

  if (!öppen) {
    return (
      <button
        onClick={() => setÖppen(true)}
        style={{
          alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, fontFamily: F,
          color: '#eab308', background: 'none', border: 'none', padding: 0,
          cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        {T.open}
      </button>
    )
  }

  return (
    <div style={{
      border: '1px solid #1e293b', borderRadius: 10, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontFamily: F }}>{T.title}</span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setÖppen(false)}
          style={{
            fontSize: 11, color: '#64748b', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: F, padding: 0,
          }}
        >
          {T.close}
        </button>
      </div>

      {/* Ingen flexbox här, och det är inte en smaksak: flexobjekt ritar inga
          listmarkörer, så numren försvann. Avståndet mellan stegen sätts på
          punkterna i stället. En guide utan numrerade steg är en textmassa. */}
      <ol style={{
        margin: 0, paddingLeft: 18, listStyleType: 'decimal',
        fontSize: 11, color: '#cbd5e1', fontFamily: F, lineHeight: 1.55,
      }}>
        {T.steg.map(([rubrik, text], i) => (
          <li key={i} style={{ marginTop: i ? 9 : 0 }}>
            <strong style={{ color: '#f1f5f9' }}>{rubrik}</strong> {text}
          </li>
        ))}
      </ol>

      {/* Länken sist i listan men som knapp, eftersom det är den som gör
          något. Ny flik med flit: guiden ska stå kvar att läsa medan de
          handlar. */}
      <a
        href={länk}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', alignSelf: 'flex-start' }}
      >
        <Btn onClick={() => {}}>{T.go}</Btn>
      </a>

      <Notis tone="info">{T.ditt}</Notis>
      <p style={helpTxt}>{T.sen}</p>
    </div>
  )
}

const T = {
  open:  'Så köper du en domän →',
  close: 'Stäng',
  title: 'Köpa domän hos Netim',
  go:    'Öppna Netim i ny flik',

  /* Ordningen följer skärmarna, inte hur mycket vi har att säga om varje sak.
     Det som kostar pengar eller går att göra fel har fått en egen punkt. */
  steg: [
    ['Sök på namnet.',
     'Salongens namn räcker — du behöver inte hitta på något nytt. Grön ram i listan betyder att adressen är ledig.'],
    ['Välj .se.',
     'Svenska kunder litar på svenska adresser, och Google förstår att du finns här. .com fungerar också, och är billigare, men säger ingenting om var du håller till.'],
    ['Tryck Register.',
     'Lämna rutan på "1 year". Du kan alltid förnya längre senare, och ett år räcker för att komma igång.'],
    ['Köp bara domänen.',
     'I kassan erbjuds du SSL-certifikat från Sectigo för €14 om året. Tacka nej. Ditt certifikat ingår hos oss och förnyas automatiskt — köper du ett till kan du inte ens använda det.'],
    ['Momsen.',
     'Priserna visas exklusive moms. Har du ett momsregistrerat företag anger du ditt momsnummer i kassan, då tillkommer ingen moms. Annars läggs 25 % på.'],
    ['Organisationsnummer.',
     'En .se-adress kräver att innehavaren identifieras. Aktiebolag anger organisationsnummer, enskild firma personnummer.'],
    ['Använd en e-post du läser.',
     'Dit går påminnelserna om förnyelse. En domän som inte förnyas slutar fungera, och då slocknar hemsida, bokning och mail samtidigt.'],
  ] as [string, string][],

  ditt: 'Domänen står i ditt namn. Den är din även om du slutar hos oss, och du tar med dig den vart du vill.',
  sen:  'När köpet är klart lägger du in adressen i rutan här ovanför. Då får du de två namnservrarna att klistra in hos Netim, och vi märker själva när bytet gått igenom.',
}
