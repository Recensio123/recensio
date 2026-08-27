import { NextResponse } from 'next/server'
import { currentCompany } from '@/lib/companyScope'
import Anthropic from '@anthropic-ai/sdk'
import { bookingServices } from '@/lib/trades'
import { measureKeywords, type Measured } from '@/lib/keywordVolume'

/*
 * Suggestions are proposed, then measured, then compared to what the salon
 * already has.
 *
 * Two things were wrong before. The model handed back a volume and difficulty
 * of its own invention, which the panel printed as though counted. And the
 * advice was to target a phrase with the town stapled on — "hårfärgning
 * södermalm" — which is not how a local business wins that search. Google
 * already knows where the salon is, from its address, its Google profile and
 * its own pages. What it does not know is that they do colour work, because
 * there are two lines about it on the site.
 *
 * So the suggestion is the treatment, the number comes from Keyword Planner,
 * and the advice is to write about the treatment.
 */
export type Suggestion = {
  /** The treatment term to own. No place name — see the note above. */
  keyword:   string
  rationale: string
  /** Monthly searches nationally. Absent when we could not measure. */
  avgVolume?:   number
  competition?: 'LOW' | 'MEDIUM' | 'HIGH'
  /** What the salon already gets for this term, from Search Console. */
  seenPerMonth?: number
  position?:     number
}

const MOCK_SUGGESTIONS: Suggestion[] = [
  { keyword: 'balayage',          rationale: 'Värdefull färgbehandling med stark bokningsvilja' },
  { keyword: 'hårfärgning',       rationale: 'Bred efterfrågan och återkommande kunder — färg växer ut' },
  { keyword: 'keratinbehandling', rationale: 'Premiumbehandling med högt pris per bokning' },
  { keyword: 'drop in frisör',    rationale: 'Sökningar på tid samma dag leder ofta direkt till bokning' },
  { keyword: 'barnklippning',     rationale: 'Familjebokningar ger återkommande besök från hela hushållet' },
]

type SCRow = { query: string; impressions: number; position: number }

/**
 * Attach the two things that turn a phrase into advice: what Google says the
 * demand is, and what the salon already gets for it.
 *
 * Presence is matched loosely — a salon ranking for "hårfärgning stockholm"
 * plainly has content about hårfärgning, and telling them to write some would
 * be wrong. Anything unmeasured arrives without figures so the panel can say
 * so instead of printing a guess.
 */
async function enrich(companyId: string, list: Suggestion[], sc: SCRow[]): Promise<Suggestion[]> {
  const measured = await measureKeywords(companyId, list.map(s => s.keyword), { fallbackToMock: true })

  return list.map(s => {
    const term    = s.keyword.toLowerCase()
    const related = sc.filter(r => r.query.toLowerCase().includes(term))
    const seen    = related.reduce((sum, r) => sum + (r.impressions ?? 0), 0)
    const best    = related.length
      ? Math.min(...related.map(r => r.position ?? 99))
      : undefined

    const m: Measured | undefined = measured?.get(s.keyword)
    return {
      ...s,
      ...(m ? { avgVolume: m.avgVolume, competition: m.competition } : {}),
      ...(related.length ? { seenPerMonth: seen, position: best } : {}),
    }
  })
}

export async function POST() {
    const c = await currentCompany()
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = c.admin
  const { data: company } = await admin
    .from('companies')
    .select('id, name, country, city, postal_code, industry')
    .eq('id', c.id)
    .single()

  if (!company) return NextResponse.json({ error: 'No company found' }, { status: 404 })

  const { data: queries } = await admin
    .from('search_console_queries')
    .select('query, clicks, impressions, position')
    .eq('company_id', company.id)
    .order('impressions', { ascending: false })
    .limit(30)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    return NextResponse.json({ suggestions: await enrich(company.id, MOCK_SUGGESTIONS, (queries ?? []) as SCRow[]) })
  }

  const topKeywords = (queries ?? [])
    .map(q => `${q.query} (pos #${Math.round(q.position)}, ${q.impressions} impr/mo)`)
    .join('\n') || 'No Search Console data yet'

  /* The trade's own price list, so a salon that signed up yesterday still
   * gets suggestions about the treatments it actually sells. Search Console
   * history says what people already find them for; this says what they do. */
  const tradeServices = bookingServices(company.industry)
    .map(s => s.name)
    .slice(0, 20)
    .join(', ')

  // Detect market from stored country first, then SC site URL + keywords as fallback
  const { data: conn } = await admin
    .from('google_connections')
    .select('sc_site_url')
    .eq('company_id', company.id)
    .single()

  const siteUrl = conn?.sc_site_url ?? ''
  const kws     = (queries ?? []).map(q => q.query).join(' ').toLowerCase()
  const url     = siteUrl.toLowerCase()
  const stored  = (company.country ?? '').toLowerCase()

  type MarketDesc = { marketDesc: string; persona: string }

  const KEYWORD_MARKETS: Record<string, MarketDesc> = {
    sweden:      { marketDesc: 'Swedish local service market',     persona: 'You are a senior Swedish local SEO specialist with 12 years of experience helping Swedish service businesses rank on Google. You have deep knowledge of how Swedish consumers search, what keywords convert in Sweden, and seasonal search patterns in the Swedish market.' },
    norway:      { marketDesc: 'Norwegian local service market',   persona: 'You are a senior Norwegian local SEO specialist with 12 years of experience helping Norwegian service businesses. Expert in Norwegian search behaviour and seasonal patterns.' },
    denmark:     { marketDesc: 'Danish local service market',      persona: 'You are a senior Danish local SEO specialist with 12 years of experience helping Danish service businesses. Expert in Danish consumer behaviour and local search patterns.' },
    finland:     { marketDesc: 'Finnish local service market',     persona: 'You are a senior Finnish local SEO specialist with 12 years of experience helping Finnish service businesses. Expert in Finnish consumer behaviour and local search patterns.' },
    germany:     { marketDesc: 'German local service market',      persona: 'You are a senior German local SEO specialist with 12 years of experience helping German service businesses. Expert in German search behaviour and the trust-driven German consumer market.' },
    switzerland: { marketDesc: 'Swiss local service market',       persona: 'You are a senior Swiss local SEO specialist with 12 years of experience in the multilingual Swiss market. Expert in Swiss search patterns across German, French, and Italian-speaking regions.' },
    austria:     { marketDesc: 'Austrian local service market',    persona: 'You are a senior Austrian local SEO specialist with 12 years of experience helping Austrian service businesses. Expert in Austrian consumer behaviour and local search patterns.' },
    netherlands: { marketDesc: 'Dutch local service market',       persona: 'You are a senior Dutch local SEO specialist with 12 years of experience helping Dutch service businesses. Expert in Dutch consumer behaviour and local search patterns.' },
    uk:          { marketDesc: 'UK local service market',          persona: 'You are a senior UK local SEO specialist with 12 years of experience helping British service businesses. Expert in UK search behaviour and local ranking factors.' },
    australia:   { marketDesc: 'Australian local service market',  persona: 'You are a senior Australian local SEO specialist with 12 years of experience helping Australian service businesses. Expert in Australian consumer behaviour and local search patterns.' },
    us:          { marketDesc: 'US local service market',          persona: 'You are a senior US local SEO specialist with 12 years of experience helping American service businesses. Expert in US consumer behaviour and local search patterns.' },
    canada:      { marketDesc: 'Canadian local service market',    persona: 'You are a senior Canadian local SEO specialist with 12 years of experience helping Canadian service businesses. Expert in Canadian consumer behaviour and local search patterns.' },
  }

  function detectKeywordMarket(): MarketDesc {
    // Primary: stored country
    if (stored && KEYWORD_MARKETS[stored]) return KEYWORD_MARKETS[stored]
    // Fallback: URL extension + keyword patterns
    if (url.includes('.se') || kws.match(/stockholm|göteborg|malmö|sverige/))       return KEYWORD_MARKETS.sweden
    if (url.includes('.no') || kws.match(/oslo|bergen|trondheim|norge/))             return KEYWORD_MARKETS.norway
    if (url.includes('.dk') || kws.match(/københavn|aarhus|odense|danmark/))         return KEYWORD_MARKETS.denmark
    if (url.includes('.fi') || kws.match(/helsinki|tampere|turku|suomi/))            return KEYWORD_MARKETS.finland
    if (url.includes('.ch') || kws.match(/zürich|bern|basel|genf|schweiz/))          return KEYWORD_MARKETS.switzerland
    if (url.includes('.at') || kws.match(/wien|graz|linz|österreich/))               return KEYWORD_MARKETS.austria
    if (url.includes('.de') || kws.match(/berlin|münchen|hamburg|deutschland/))      return KEYWORD_MARKETS.germany
    if (url.includes('.nl') || kws.match(/amsterdam|rotterdam|den haag|nederland/))  return KEYWORD_MARKETS.netherlands
    if (url.match(/\.co\.uk|\.uk/) || kws.match(/london|manchester|birmingham/))     return KEYWORD_MARKETS.uk
    if (url.match(/\.com\.au|\.au/) || kws.match(/sydney|melbourne|brisbane/))       return KEYWORD_MARKETS.australia
    if (url.includes('.ca') || kws.match(/toronto|vancouver|montreal/))              return KEYWORD_MARKETS.canada
    if (url.includes('.us') || kws.match(/new york|los angeles|chicago/))            return KEYWORD_MARKETS.us
    return { marketDesc: 'local service business market', persona: 'You are a senior local SEO keyword specialist with 12 years of experience helping local service businesses.' }
  }

  const { marketDesc, persona } = detectKeywordMarket()

  try {
    const client = new Anthropic({ apiKey })
    const now    = new Date()
    const month  = now.toLocaleString('en-GB', { month: 'long' })

    // Build precise location string for keyword targeting
    const locationParts: string[] = []
    if (company.city)        locationParts.push(company.city)
    if (company.postal_code) locationParts.push(company.postal_code)
    const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null

    const message = await client.messages.create({
      model:      'claude-opus-5',
      max_tokens: 1500,
      system:     persona,
      messages: [{
        role: 'user',
        content: `The business is "${company.name}" operating in the ${marketDesc}.${locationStr ? ` Their exact location is: ${locationStr}.` : ''} Current month: ${month}.

Their current Search Console keywords:
${topKeywords}

The treatments they actually sell:
${tradeServices || 'Unknown'}

Based on this data and your expertise in the ${marketDesc}:
1. Suggest 5 treatments or services they should be winning searches for but are not yet. Ground them in the treatments listed above — a keyword for a service they do not offer is worthless however popular it is.

Return the plain treatment term the way people actually search it nationally ("hårfärgning", "balayage", "keratinbehandling"). Do NOT append the town or district. Their location is already established for Google by their address, their Google Business Profile and their own pages; what is missing is depth about the treatment itself. A phrase with the town stapled on is not what wins these searches and reads badly on the page.

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "suggestions": [
    { "keyword": "string", "rationale": "string (1 sentence, in the market’s language, saying why this treatment is worth the effort)" }
  ]
}`,
      }],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0]) as { suggestions?: Suggestion[] }
    const list = (parsed.suggestions ?? []).filter(x => x?.keyword)
    return NextResponse.json({ suggestions: await enrich(company.id, list, (queries ?? []) as SCRow[]) })
  } catch {
    // Fall back to mock if AI fails
    return NextResponse.json({ suggestions: await enrich(company.id, MOCK_SUGGESTIONS, (queries ?? []) as SCRow[]) })
  }
}
