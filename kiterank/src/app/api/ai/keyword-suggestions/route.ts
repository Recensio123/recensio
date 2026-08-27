import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { currentCompany } from '@/lib/companyScope'
import { type KeywordSuggestion } from '@/app/(kiterank)/dashboard/paid-search/types'

// ── Reservdata (exempelsalongen på Södermalm) ────────────────────────────────
// Realistic mock that demonstrates the tool's value — used when no API key is
// present or as a reference for what real output looks like.

const MOCK_SUGGESTIONS: KeywordSuggestion[] = [
  { keyword: 'balayage stockholm',           matchType: 'Exact',  category: 'Färgbehandlingar',     cpcDisplay: '18–26 SEK/klick', cpcMicros: 22_000_000, reason: 'Dyraste behandlingen med tydlig köpavsikt — den som söker på ortsnamnet letar efter en salong att boka, inte efter inspiration', priority: 'High'   },
  { keyword: 'slingor södermalm',            matchType: 'Exact',  category: 'Färgbehandlingar',     cpcDisplay: '15–22 SEK/klick', cpcMicros: 18_000_000, reason: 'Stadsdelen i sökningen betyder att personen redan bestämt var de vill gå',                                                priority: 'High'   },
  { keyword: 'keratinbehandling stockholm',  matchType: 'Exact',  category: 'Behandlingar',         cpcDisplay: '14–20 SEK/klick', cpcMicros: 17_000_000, reason: 'Premiumbehandling med högt värde per bokning och få salonger som annonserar på den',                                    priority: 'High'   },
  { keyword: 'frisör södermalm',             matchType: 'Phrase', category: 'Bransch + plats',      cpcDisplay: '12–18 SEK/klick', cpcMicros: 15_000_000, reason: 'Grundsökningen i området — bred men med hög andel som bokar samma vecka',                                              priority: 'High'   },
  { keyword: 'bruduppsättning stockholm',    matchType: 'Phrase', category: 'Tillfällen',           cpcDisplay: '16–24 SEK/klick', cpcMicros: 20_000_000, reason: 'Säsongsbunden men lönsam — bokas i god tid och drar ofta med sig provuppsättning',                                       priority: 'Medium' },
  { keyword: 'drop in frisör stockholm',     matchType: 'Phrase', category: 'Snabb bokning',        cpcDisplay: '10–15 SEK/klick', cpcMicros: 12_000_000, reason: 'Söks av någon som vill komma i dag — fyller luckor i kalendern samma eftermiddag',                                       priority: 'Medium' },
  { keyword: 'herrklippning södermalm',      matchType: 'Exact',  category: 'Klippning',            cpcDisplay:  '8–12 SEK/klick', cpcMicros:  9_000_000, reason: 'Lägre pris per bokning men billigt klick och hög andel återkommande',                                                   priority: 'Medium' },
  { keyword: 'hårförlängning stockholm',     matchType: 'Phrase', category: 'Behandlingar',         cpcDisplay: '20–30 SEK/klick', cpcMicros: 25_000_000, reason: 'Högsta värdet per bokning i hela branschen — dyrt klick men få behöver konverteras',                                    priority: 'Medium' },
  { keyword: 'toning mörkt hår',             matchType: 'Phrase', category: 'Färgbehandlingar',     cpcDisplay:  '9–14 SEK/klick', cpcMicros: 11_000_000, reason: 'Specifik behandling som lockar den som redan vet vad de vill ha',                                                       priority: 'Medium' },
  { keyword: 'frisör nära mig',              matchType: 'Phrase', category: 'Bred sökning',         cpcDisplay: '11–16 SEK/klick', cpcMicros: 13_000_000, reason: 'Stor volym men lös avsikt — värd att ha med, värd att bevaka noga',                                                    priority: 'Medium' },
]

// ── JSON parser ───────────────────────────────────────────────────────────────

function parseKeywords(text: string): KeywordSuggestion[] | null {
  try {
    // Accept both { keywords: [...] } and a raw array
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    const arr: KeywordSuggestion[] = Array.isArray(parsed) ? parsed : (parsed.keywords ?? null)
    if (!Array.isArray(arr) || arr.length === 0) return null
    // Validate and normalise fields
    return arr
      .filter(k => k.keyword && k.matchType && k.category)
      .map(k => ({
        keyword:    String(k.keyword).toLowerCase().trim(),
        matchType:  k.matchType === 'Phrase' ? 'Phrase' : 'Exact',
        category:   String(k.category),
        cpcDisplay: String(k.cpcDisplay ?? '—'),
        cpcMicros:  Number(k.cpcMicros ?? 10_000_000),
        reason:     String(k.reason ?? ''),
        priority:   k.priority === 'Medium' ? 'Medium' : 'High',
      } satisfies KeywordSuggestion))
      .slice(0, 20)
  } catch {
    return null
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  /* Rutten skickar en fråga till modellen och betalar för svaret. Öppen var
     den vår faktura åt vem som helst som hittade adressen. */
  if (!await currentCompany()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessType, location, services, country, currency, existingKeywords = [] } =
    (await req.json()) as {
      businessType:     string
      location:         string
      services?:        string
      country?:         string
      currency?:        string
      existingKeywords?: string[]
    }

  if (!businessType?.trim() || !location?.trim()) {
    return NextResponse.json({ error: 'businessType and location are required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    return NextResponse.json({ keywords: MOCK_SUGGESTIONS })
  }

  const countryStr  = country  || 'the relevant market'
  const currencyStr = currency || 'local currency'
  const skipList    = existingKeywords.length > 0
    ? `\nDo NOT include any of these already-active keywords:\n${existingKeywords.map(k => `- ${k}`).join('\n')}`
    : ''

  const prompt = `
Business type: ${businessType.trim()}
Location: ${location.trim()}
${services?.trim() ? `Services offered: ${services.trim()}` : ''}
Country: ${countryStr}
Currency: ${currencyStr}${skipList}

Generate the 15–20 most valuable Google Ads keywords for this local service business.
Focus exclusively on commercial intent — people actively searching to hire or buy today.

Return ONLY valid JSON with no markdown or explanation:
{
  "keywords": [
    {
      "keyword": "balayage stockholm",
      "matchType": "Exact",
      "category": "Service + location",
      "cpcDisplay": "18–26 SEK/click",
      "cpcMicros": 22000000,
      "reason": "Highest-intent query — someone searching a treatment plus a place is looking for somewhere to book",
      "priority": "High"
    }
  ]
}

Rules:
- 12–20 keywords total
- matchType must be "Exact" OR "Phrase" — never "Broad" (too risky for a small budget)
- Include the city or area name in the highest-intent keywords
- cpcMicros: realistic CPC in ${currencyStr} × 1 000 000 (e.g. 150 SEK = 150000000)
- cpcDisplay: human-readable range, e.g. "140–190 ${currencyStr}/click"
- Categories must fit the trade the business is actually in, not a fixed list. Use short, plain labels such as "Service + location", "Premium services", "Same-day / walk-in", "Occasions", "Location variants", "Seasonal"
- priority "High" = searcher is ready to hire today; "Medium" = strong intent but less urgent
- reason: one plain-English sentence a business owner with no marketing background will understand
- Never include: DIY, how-to, salary, jobs, training, course, review, forum
- Keep keywords lowercase
`.trim()

  try {
    const client  = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model:      'claude-opus-5',
      max_tokens: 3000,
      system:     `You are a senior Google Ads specialist for local service businesses in ${countryStr}. You generate precise, high-converting keyword lists. You never use Broad match for businesses with modest budgets. Every keyword you recommend has been validated against real search behaviour in ${countryStr}.`,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text    = message.content[0].type === 'text' ? message.content[0].text : ''
    const keywords = parseKeywords(text)

    return NextResponse.json({ keywords: keywords ?? MOCK_SUGGESTIONS })
  } catch {
    return NextResponse.json({ keywords: MOCK_SUGGESTIONS })
  }
}
