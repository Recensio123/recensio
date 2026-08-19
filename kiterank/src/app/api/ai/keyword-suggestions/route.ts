import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { type KeywordSuggestion } from '@/app/(kiterank)/dashboard/paid-search/types'

// ── Mock fallback (Stockholm plumber) ─────────────────────────────────────────
// Realistic mock that demonstrates the tool's value — used when no API key is
// present or as a reference for what real output looks like.

const MOCK_SUGGESTIONS: KeywordSuggestion[] = [
  { keyword: 'emergency plumber stockholm',         matchType: 'Exact',  category: 'Emergency / Urgent',      cpcDisplay: '180–250 SEK/click', cpcMicros: 21_000_000, reason: 'Highest-intent search in the category — people who type this need someone within hours, not days', priority: 'High'   },
  { keyword: '24 hour plumber stockholm',           matchType: 'Exact',  category: 'Emergency / Urgent',      cpcDisplay: '160–220 SEK/click', cpcMicros: 19_000_000, reason: 'Time-sensitive qualifier means the searcher has already decided to pay — very high close rate', priority: 'High'   },
  { keyword: 'same day plumber stockholm',          matchType: 'Exact',  category: 'Emergency / Urgent',      cpcDisplay: '150–200 SEK/click', cpcMicros: 17_000_000, reason: 'Speed qualifier separates urgent buyers from price browsers who can wait a week',              priority: 'High'   },
  { keyword: 'burst pipe repair stockholm',         matchType: 'Phrase', category: 'Emergency / Urgent',      cpcDisplay: '150–200 SEK/click', cpcMicros: 17_000_000, reason: 'Problem-specific emergency query — these calls convert immediately because the damage is live',  priority: 'High'   },
  { keyword: 'boiler installation stockholm',       matchType: 'Exact',  category: 'Installation',            cpcDisplay: '160–200 SEK/click', cpcMicros: 18_000_000, reason: 'High-value job keyword — boiler replacements generate 15 000–40 000 SEK revenue per booking', priority: 'High'   },
  { keyword: 'new boiler price stockholm',          matchType: 'Phrase', category: 'Installation',            cpcDisplay: '130–180 SEK/click', cpcMicros: 15_000_000, reason: 'Price-intent modifier shows a buyer comparing options — capture them before they contact a rival', priority: 'High'   },
  { keyword: 'water heater installation stockholm', matchType: 'Exact',  category: 'Installation',            cpcDisplay: '130–170 SEK/click', cpcMicros: 15_000_000, reason: 'High-value installation with an 8 000–20 000 SEK average job value',                            priority: 'Medium' },
  { keyword: 'bathroom plumbing renovation',        matchType: 'Phrase', category: 'Installation',            cpcDisplay: '120–160 SEK/click', cpcMicros: 14_000_000, reason: 'Project-based work with high average value — renovations typically mean multiple days of work',   priority: 'Medium' },
  { keyword: 'boiler service stockholm',            matchType: 'Exact',  category: 'Repair & Maintenance',   cpcDisplay: '120–160 SEK/click', cpcMicros: 14_000_000, reason: 'Annual recurring service — maintenance clients become long-term repeat customers',                 priority: 'High'   },
  { keyword: 'boiler repair stockholm',             matchType: 'Exact',  category: 'Repair & Maintenance',   cpcDisplay: '130–170 SEK/click', cpcMicros: 15_000_000, reason: 'Broken boiler = needs fixing today — high urgency with clear buying intent',                       priority: 'High'   },
  { keyword: 'leaking pipe repair stockholm',       matchType: 'Phrase', category: 'Repair & Maintenance',   cpcDisplay: '130–170 SEK/click', cpcMicros: 15_000_000, reason: 'Common problem with immediate commercial intent — searchers need a fix today, not information',    priority: 'High'   },
  { keyword: 'blocked drain stockholm',             matchType: 'Exact',  category: 'Repair & Maintenance',   cpcDisplay: '110–150 SEK/click', cpcMicros: 13_000_000, reason: 'Specific service search with clear buyer intent and lower competition than generic plumber terms',  priority: 'Medium' },
  { keyword: 'plumber near me stockholm',           matchType: 'Phrase', category: 'Location variants',       cpcDisplay: '140–190 SEK/click', cpcMicros: 16_000_000, reason: '"Near me" searches convert 2–3× faster than general queries — the searcher wants someone local now', priority: 'High'   },
  { keyword: 'licensed plumber stockholm',          matchType: 'Phrase', category: 'Location variants',       cpcDisplay: '110–150 SEK/click', cpcMicros: 13_000_000, reason: 'Quality-intent modifier signals a buyer vetting credentials, not shopping for the cheapest price',  priority: 'Medium' },
  { keyword: 'plumber södermalm',                   matchType: 'Phrase', category: 'Location variants',       cpcDisplay: '100–140 SEK/click', cpcMicros: 12_000_000, reason: 'District-level keyword — lower competition than city-level with equally strong local buying intent', priority: 'Medium' },
  { keyword: 'pipe freeze prevention stockholm',    matchType: 'Phrase', category: 'Seasonal',                cpcDisplay: '90–120 SEK/click',  cpcMicros: 10_000_000, reason: 'High-volume October–December search — book preventive jobs before the winter rush drives up prices', priority: 'Medium' },
  { keyword: 'underfloor heating installation',     matchType: 'Phrase', category: 'Installation',            cpcDisplay: '140–180 SEK/click', cpcMicros: 16_000_000, reason: 'Premium job with high average revenue — ideal for growing into larger renovation projects',          priority: 'Medium' },
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
      "keyword": "emergency plumber stockholm",
      "matchType": "Exact",
      "category": "Emergency / Urgent",
      "cpcDisplay": "180–250 SEK/click",
      "cpcMicros": 21000000,
      "reason": "Highest-intent query — people who search this need someone within hours",
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
- Categories: "Emergency / Urgent", "Installation", "Repair & Maintenance", "Location variants", "Seasonal"
- priority "High" = searcher is ready to hire today; "Medium" = strong intent but less urgent
- reason: one plain-English sentence a business owner with no marketing background will understand
- Never include: DIY, how-to, salary, jobs, training, course, review, forum
- Keep keywords lowercase
`.trim()

  try {
    const client  = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model:      'claude-opus-4-5',
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
