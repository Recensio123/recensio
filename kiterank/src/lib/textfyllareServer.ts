import Anthropic from '@anthropic-ai/sdk'
import { TONER, läsAntal, röstFor, type Svar, type Underlag, type Förslag } from '@/lib/textfyllare'

/*
 * Anropet mot modellen.
 *
 * Skild från textfyllare.ts, som bara är typer och val: den filen läses av
 * panelen i webbläsaren, och en import av SDK:n därifrån drar in Node-moduler
 * i klientpaketet och stoppar bygget. Gränsen är alltså inte städning utan ett
 * krav.
 */

const VERKTYG = 'skriv_texter'

/*
 * Schemat är svarets form, inte en önskelista.
 *
 * `strict` med `additionalProperties: false` och full `required` betyder att
 * fälten kommer tillbaka som de står här — inte att vi hoppas på det.
 */
const SCHEMA = {
  type: 'object' as const,
  properties: {
    heroHeading:    { type: 'string' as const },
    heroBody:       { type: 'string' as const },
    tagline:        { type: 'string' as const },
    ctaText:        { type: 'string' as const },
    aboutTitle:     { type: 'string' as const },
    aboutBody:      { type: 'string' as const },
    tjänster: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          namn:        { type: 'string' as const },
          beskrivning: { type: 'string' as const },
        },
        required: ['namn', 'beskrivning'],
        additionalProperties: false,
      },
    },
    seoTitle:       { type: 'string' as const },
    seoDescription: { type: 'string' as const },
  },
  required: [
    'heroHeading', 'heroBody', 'tagline', 'ctaText',
    'aboutTitle', 'aboutBody', 'tjänster', 'seoTitle', 'seoDescription',
  ],
  additionalProperties: false,
}

/*
 * Rollen, och gränserna.
 *
 * Längden på varje fält står i klartext eftersom en rubrik på fyrtio ord bryter
 * layouten i varje mall — det är ett formkrav och inte en stilfråga.
 *
 * Att skriva för människor och inte för sökmotorer är Googles egen linje i
 * deras riktlinjer för användbart innehåll: nyckelordsstoppning sänker en sida
 * i stället för att lyfta den. Orten ska in i rubrik och titel för att det är
 * så någon söker, inte för att täta texten med den.
 */
const PERSONA = `Du skriver webbtexter åt små svenska salonger — frisörer, hudterapeuter, massörer, nagelterapeuter.

Du har arbetat med lokal marknadsföring i över tio år. Du vet att en salongssida läses av någon som redan bestämt sig för att boka någonstans och nu väljer var, och att texten ska göra det valet lätt.

SÅ HÄR SKRIVER DU
- Svenska, du-tilltal mot besökaren.
- Konkret före svepande. "Balayage och slingor i ljust hår" slår "vi erbjuder högkvalitativa hårtjänster".
- Orten ska stå naturligt i rubriken och i söktiteln, eftersom det är så folk söker. Aldrig upprepad för sökmotorernas skull — det sänker sidan i stället för att lyfta den.
- Ingen svulstighet. Inga utropstecken om tonen inte uttryckligen är lekfull. Aldrig "vi brinner för", "din resa", "unik upplevelse", "skräddarsydd".

DETTA FÅR DU ALDRIG GÖRA
- Hitta på fakta. Antal år, antal anställda, utbildningar, utmärkelser, märken, certifieringar, antal kunder — bara det som står i underlaget. Står det ingenting: skriv ingenting om det.
- Nämna eller antyda priser.
- Lova resultat, garantier eller tider som ingen uppgett.

LÄNGDER
- heroHeading: 3–8 ord. Rubriken högst upp.
- heroBody: 1–2 meningar, högst 160 tecken.
- tagline: högst 6 ord.
- ctaText: 2–3 ord på en knapp. Till exempel "Boka tid".
- aboutTitle: 2–5 ord.
- aboutBody: 60–120 ord i två stycken åtskilda med radbrytning.
- Tjänstebeskrivningar: en mening, högst 90 tecken.
- seoTitle: högst 60 tecken, med ort.
- seoDescription: 120–155 tecken, ska ge en anledning att klicka.`

/** Är tjänsten uppsatt? Utan nyckel går inget anrop. */
export function fyllareRedo(): boolean {
  const k = process.env.ANTHROPIC_API_KEY
  return !!k && k !== 'your_anthropic_api_key'
}

function underlagsText(u: Underlag, s: Svar): string {
  const ton  = TONER.find(t => t.id === s.ton) ?? TONER[0]
  const röst = röstFor(läsAntal(s.antal))

  /* Frivilliga uppgifter tas bara med när de finns. En rad som säger "antal år:
     okänt" är en inbjudan att gissa. */
  const rader = [
    `Företag: ${u.företag}`,
    `Bransch: ${u.bransch}`,
    u.ort        && `Ort: ${u.ort}`,
    u.öppettider && `Öppettider: ${u.öppettider}`,
    u.tjänster.length && `Tjänster som säljs: ${u.tjänster.join(', ')}`,
    ``,
    `Vem som kommer till dem: ${s.målgrupp}`,
    `Tjänster de vill leda med: ${s.viktigast}`,
    `Vad som skiljer dem från andra: ${s.annorlunda}`,
    `Tonfall: ${ton.namn} — ${ton.hur}`,
    `Berättarröst: ${röst === 'jag' ? 'jag-form — hon driver salongen själv' : 'vi-form — de är flera'}. Håll den genom hela texten.`,
    s.antal.trim() && `Antal som arbetar där: ${s.antal.trim()}`,
  ].filter(Boolean)

  return rader.join('\n')
}

/**
 * Skriver texterna.
 *
 * Kastar med ett meddelande som går att visa för kunden. Anroparen fångar och
 * visar det; ett tyst misslyckande hade sett ut som att knappen är trasig.
 */
export async function skrivTexter(u: Underlag, s: Svar): Promise<Förslag> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!fyllareRedo()) throw new Error('Textfyllaren är inte uppsatt ännu.')

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model:      'claude-opus-5',
    max_tokens: 8000,
    system:     PERSONA,
    tools: [{
      name:        VERKTYG,
      description: 'Lämnar de färdiga texterna till hemsidan.',
      strict:      true,
      input_schema: SCHEMA,
    }],
    messages: [{
      role: 'user',
      content: `Skriv texterna till den här salongens hemsida. Lämna dem genom verktyget ${VERKTYG}.

${underlagsText(u, s)}

Skriv en beskrivning för varje tjänst i listan ovan, med exakt samma namn som står där.`,
    }],
  })

  const block = message.content.find(b => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    throw new Error('Fick inget svar att fylla i. Försök igen.')
  }

  /* Alltid genom JSON-tolkning och aldrig genom strängmatchning: escapningen i
     verktygets indata varierar mellan modeller. */
  const rå = block.input as Partial<Förslag>

  return {
    heroHeading:    String(rå.heroHeading    ?? ''),
    heroBody:       String(rå.heroBody       ?? ''),
    tagline:        String(rå.tagline        ?? ''),
    ctaText:        String(rå.ctaText        ?? ''),
    aboutTitle:     String(rå.aboutTitle     ?? ''),
    aboutBody:      String(rå.aboutBody      ?? ''),
    tjänster:       (rå.tjänster ?? []).map(t => ({
      namn:        String(t?.namn ?? ''),
      beskrivning: String(t?.beskrivning ?? ''),
    })).filter(t => t.namn),
    seoTitle:       String(rå.seoTitle       ?? ''),
    seoDescription: String(rå.seoDescription ?? ''),
  }
}
