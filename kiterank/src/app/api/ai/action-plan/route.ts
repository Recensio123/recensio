import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export type Action = {
  priority:     number
  category:     string
  title:        string
  description:  string
  impact:       string
  timeEstimate: string
}

// ── Market detection ─────────────────────────────────────────────────────────

type MarketProfile = {
  country:    string
  persona:    string
  benchmarks: string
  currency:   string
}

const MARKETS: Record<string, MarketProfile> = {
  sweden: {
    country:  'Sweden',
    currency: 'SEK',
    persona:  'You are a senior Swedish local SEO and Google Business Profile specialist with 12 years of experience helping Swedish service businesses grow. You have deep expertise in Swedish consumer behaviour, local search patterns in Stockholm, Göteborg, Malmö and smaller Swedish cities, and the competitive landscape for service companies in Sweden. You know exactly what separates a top-ranking Swedish GBP listing from an average one.',
    benchmarks: `Swedish market benchmarks for local service businesses:
- Google review rating: 4.5+ is excellent, 4.2–4.4 is average, below 4.0 is damaging.
- Review response rate: Top Swedish businesses respond to 90%+ of reviews. Industry average is ~40%.
- GBP impressions: 3 000–8 000/month is healthy for a Swedish city business.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%, position 3 ≈ 11%, positions 4–10: 2–6%.
- Swedish consumers trust Google Maps heavily — GBP completeness directly impacts call volume.
- "Nära mig" (near me) searches have grown 300%+ in Sweden since 2020.
- Listings with 10+ photos receive 42% more direction requests.`,
  },
  norway: {
    country:  'Norway',
    currency: 'NOK',
    persona:  'You are a senior Norwegian local SEO and Google Business Profile specialist with 12 years of experience helping Norwegian service businesses. You have deep expertise in Norwegian consumer behaviour, search patterns in Oslo, Bergen, Trondheim and other Norwegian cities, and the competitive digital landscape for local service companies in Norway.',
    benchmarks: `Norwegian market benchmarks for local service businesses:
- Google review rating: 4.5+ is excellent, 4.2–4.4 is average, below 4.0 is damaging.
- Norwegian consumers are highly digital and rely heavily on Google reviews before purchasing.
- Review response rate: Top businesses respond to 90%+. Industry average is ~40%.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%, position 3 ≈ 11%.
- GBP completeness and photo quality significantly impact local rankings in Norway.`,
  },
  denmark: {
    country:  'Denmark',
    currency: 'DKK',
    persona:  'You are a senior Danish local SEO and Google Business Profile specialist with 12 years of experience helping Danish service businesses. Expert in Danish consumer behaviour, local search patterns in Copenhagen, Aarhus, Odense and other Danish cities.',
    benchmarks: `Danish market benchmarks:
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Danish consumers are among the most digitally active in Europe.
- Review response rate: Top businesses respond to 90%+.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%.
- Google Maps is the primary discovery channel for local services in Denmark.`,
  },
  finland: {
    country:  'Finland',
    currency: 'EUR',
    persona:  'You are a senior Finnish local SEO and Google Business Profile specialist with 12 years of experience helping Finnish service businesses. Expert in Finnish consumer behaviour and local search patterns in Helsinki, Tampere, Turku and other Finnish cities.',
    benchmarks: `Finnish market benchmarks:
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Finnish consumers are highly digital and research thoroughly before contacting service providers.
- Review response rate: Top businesses respond to 90%+.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%.`,
  },
  germany: {
    country:  'Germany',
    currency: 'EUR',
    persona:  'You are a senior German-market local SEO and Google Business Profile specialist with 12 years of experience helping German service businesses. You have deep expertise in German consumer behaviour, local search patterns across German cities, and the highly trust-driven German service market. You understand that German consumers research extensively and that credibility signals are critical.',
    benchmarks: `German market benchmarks for local service businesses:
- German consumers are extremely trust-driven — reviews and ratings carry more weight than in most markets.
- Google review rating: 4.5+ is excellent, 4.2–4.4 is average, below 3.8 is seriously damaging.
- Review response rate: 90%+ is expected by German consumers, especially for negative reviews.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%, position 3 ≈ 11%.
- DSGVO (GDPR) compliance messaging can improve conversion rates in Germany.
- Listings with complete business hours, detailed descriptions and photos rank significantly better.`,
  },
  switzerland: {
    country:  'Switzerland',
    currency: 'CHF',
    persona:  'You are a senior Swiss local SEO and Google Business Profile specialist with 12 years of experience in the Swiss market. You understand the multilingual nature of Switzerland (German, French, Italian regions), Swiss consumer expectations of quality and precision, and local search patterns in Zürich, Bern, Basel, Geneva and other Swiss cities.',
    benchmarks: `Swiss market benchmarks:
- Swiss consumers expect premium quality — a rating below 4.2 significantly reduces conversion.
- Google review rating: 4.5+ is excellent; below 4.0 is seriously damaging in the Swiss market.
- Review response rate: Top Swiss businesses respond to 95%+ of reviews.
- Competition in Swiss city keywords (Zürich, Bern, Basel) is among the most intense in Europe.
- Swiss consumers research very thoroughly — detailed, professional GBP profiles convert far better.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%.`,
  },
  austria: {
    country:  'Austria',
    currency: 'EUR',
    persona:  'You are a senior Austrian local SEO and Google Business Profile specialist with 12 years of experience helping Austrian service businesses. Expert in Austrian consumer behaviour and local search patterns in Vienna, Graz, Linz and other Austrian cities.',
    benchmarks: `Austrian market benchmarks:
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Austrian consumers research thoroughly before purchasing local services.
- Review response rate: Top businesses respond to 90%+.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%.`,
  },
  netherlands: {
    country:  'Netherlands',
    currency: 'EUR',
    persona:  'You are a senior Dutch local SEO and Google Business Profile specialist with 12 years of experience helping Dutch service businesses. Expert in Dutch consumer behaviour, price transparency expectations, and local search patterns in Amsterdam, Rotterdam, The Hague and other Dutch cities.',
    benchmarks: `Dutch market benchmarks:
- Dutch consumers are price-conscious — clear pricing and value propositions convert better.
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Review response rate: Top businesses respond to 90%+.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%.
- Google Maps usage for finding local services is very high in the Netherlands.`,
  },
  uk: {
    country:  'United Kingdom',
    currency: 'GBP',
    persona:  'You are a senior UK local SEO and Google Business Profile specialist with 12 years of experience helping British service businesses grow. Expert in UK consumer behaviour, local search patterns across London, Manchester, Birmingham and other UK cities, and the highly competitive British service market.',
    benchmarks: `UK market benchmarks:
- 46% of all Google searches in the UK have local intent.
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Review response rate: Top UK businesses respond to 90%+.
- "Near me" searches have grown 500%+ in recent years in the UK.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%, position 3 ≈ 11%.
- Listings with photos receive 35% more website clicks than those without.`,
  },
  australia: {
    country:  'Australia',
    currency: 'AUD',
    persona:  'You are a senior Australian local SEO and Google Business Profile specialist with 12 years of experience helping Australian service businesses. Expert in Australian consumer behaviour and local search patterns in Sydney, Melbourne, Brisbane, Perth and other Australian cities.',
    benchmarks: `Australian market benchmarks:
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Mobile-first: over 70% of local searches in Australia happen on mobile.
- Review response rate: Top businesses respond to 90%+.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%.`,
  },
  us: {
    country:  'United States',
    currency: 'USD',
    persona:  'You are a senior US local SEO and Google Business Profile specialist with 12 years of experience helping American service businesses. Expert in US consumer behaviour, local search patterns across major US metro areas, and the competitive American service business landscape.',
    benchmarks: `US market benchmarks:
- 46% of all Google searches have local intent in the US.
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Review response rate: Top businesses respond to 90%+.
- "Near me" searches doubled in recent years.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%, position 3 ≈ 11%.`,
  },
  canada: {
    country:  'Canada',
    currency: 'CAD',
    persona:  'You are a senior Canadian local SEO and Google Business Profile specialist with 12 years of experience helping Canadian service businesses. Expert in Canadian consumer behaviour and local search patterns in Toronto, Vancouver, Montreal, Calgary and other Canadian cities.',
    benchmarks: `Canadian market benchmarks:
- Google review rating: 4.5+ is excellent, below 4.0 is damaging.
- Canadian consumers research extensively before contacting local service providers.
- Review response rate: Top businesses respond to 90%+.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%.`,
  },
}

const DEFAULT_MARKET: MarketProfile = {
  country:  'your market',
  currency: 'local currency',
  persona:  'You are a senior local SEO and Google Business Profile specialist with 12 years of experience helping service businesses across multiple markets. Expert in local search optimisation, consumer behaviour, and GBP best practices.',
  benchmarks: `Local service business benchmarks:
- Google review rating: 4.5+ is excellent, 4.2–4.4 is average, below 4.0 is damaging.
- Review response rate: Top businesses respond to 90%+. Industry average is ~40%.
- GBP impressions: 3 000–8 000/month is healthy for a city-based business.
- Organic CTR: position 1 ≈ 28%, position 2 ≈ 15%, position 3 ≈ 11%, positions 4–10: 2–6%.
- Listings with 10+ photos get 42% more direction requests.`,
}

function detectMarket(storedCountry: string | null, siteUrl: string, keywords: string[]): MarketProfile {
  // Primary: use the country the user explicitly set — works for any domain including .com
  if (storedCountry && MARKETS[storedCountry]) return MARKETS[storedCountry]

  // Fallback: detect from SC domain extension + keyword patterns
  const url = (siteUrl ?? '').toLowerCase()
  const kws = keywords.join(' ').toLowerCase()

  if (url.includes('.se') || kws.match(/stockholm|göteborg|malmö|sweden|sverige/)) return MARKETS.sweden
  if (url.includes('.no') || kws.match(/oslo|bergen|trondheim|norway|norge/))       return MARKETS.norway
  if (url.includes('.dk') || kws.match(/københavn|aarhus|odense|denmark|danmark/))  return MARKETS.denmark
  if (url.includes('.fi') || kws.match(/helsinki|tampere|turku|finland|suomi/))     return MARKETS.finland
  if (url.includes('.ch') || kws.match(/zürich|zurich|bern|basel|geneva|genf|switzerland/)) return MARKETS.switzerland
  if (url.includes('.at') || kws.match(/wien|vienna|graz|linz|austria|österreich/)) return MARKETS.austria
  if (url.includes('.de') || kws.match(/berlin|münchen|munich|hamburg|germany|deutschland/)) return MARKETS.germany
  if (url.includes('.nl') || kws.match(/amsterdam|rotterdam|den haag|netherlands|nederland/)) return MARKETS.netherlands
  if (url.match(/\.co\.uk|\.uk/) || kws.match(/london|manchester|birmingham|glasgow|united kingdom/)) return MARKETS.uk
  if (url.match(/\.com\.au|\.au/) || kws.match(/sydney|melbourne|brisbane|perth|australia/)) return MARKETS.australia
  if (url.includes('.ca') || kws.match(/toronto|vancouver|montreal|calgary|canada/)) return MARKETS.canada
  if (url.includes('.us') || kws.match(/new york|los angeles|chicago|houston|united states/)) return MARKETS.us

  return DEFAULT_MARKET
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK_ACTIONS: Action[] = [
  {
    priority:     1,
    category:     'Reviews',
    title:        'Reply to all unanswered reviews this week',
    description:  'Go to your Google Business Profile and write a personal reply to every review that has not been answered yet. Thank positive reviewers by name and address any concerns raised in negative ones specifically.',
    impact:       'Responding to reviews improves your local ranking signal and shows potential customers you are attentive. Businesses that reply to 90%+ of reviews typically see a 0.2–0.5 star rating improvement within 90 days.',
    timeEstimate: '30 minutes',
  },
  {
    priority:     2,
    category:     'SEO',
    title:        'Rewrite your homepage title tag to improve CTR',
    description:  'Your homepage ranks #2 for your main keyword but your CTR is 2.1% — far below the ~15% expected at position 2. Rewrite your title tag to include urgency, your city, and a differentiator: e.g. "Plumber Stockholm — Same Day, Fixed Price | Book Online".',
    impact:       'A better title at position 2 could 5–7x your organic clicks without any ranking change — this is the single highest-leverage SEO action available right now.',
    timeEstimate: '1 hour',
  },
  {
    priority:     3,
    category:     'Ads',
    title:        'Pause zero-conversion keywords in Google Ads',
    description:  'Two keywords have spent over 700 SEK combined with zero conversions. Log into Google Ads, find these keywords in your campaign, and pause them immediately.',
    impact:       'Stops wasted spend immediately and reallocates your daily budget to the keywords that are actually driving enquiries.',
    timeEstimate: '15 minutes',
  },
  {
    priority:     4,
    category:     'Photos',
    title:        'Add interior and team photos to your GBP listing',
    description:  'Your profile is missing interior and team photos — two of the highest-engagement categories. Take 3–5 photos of your workspace and team in action, then upload them via Google Business Profile.',
    impact:       'Listings with complete photo sets get up to 42% more direction requests and 35% more website clicks than profiles without.',
    timeEstimate: '1–2 hours',
  },
  {
    priority:     5,
    category:     'SEO',
    title:        'Create a dedicated page for your top missed keyword',
    description:  'Your top unranked keyword gets 1 000+ monthly impressions but you sit at position 30+, meaning you are essentially invisible. Create a dedicated service page targeting this keyword with a clear headline, service description, pricing, and a booking CTA.',
    impact:       'A dedicated, optimised page can reach page 1 within 2–3 months, capturing high-intent leads currently going to competitors.',
    timeEstimate: '2–3 hours',
  },
]

// ── JSON helper ───────────────────────────────────────────────────────────────

function parseActions(text: string): Action[] | null {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    return parsed.actions ?? null
  } catch {
    return null
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id, name, country, city, postal_code')
    .eq('user_id', user.id)
    .single()

  if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 })

  const [
    { data: scores },
    { data: snapshot },
    { data: scQueries },
    { data: wastedKeywords },
    { data: ga4 },
    { data: conn },
  ] = await Promise.all([
    admin.from('benchmark_scores').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(1).single(),
    admin.from('gbp_snapshots').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(1).single(),
    admin.from('search_console_queries').select('*').eq('company_id', company.id).order('impressions', { ascending: false }).limit(20),
    admin.from('ads_keywords').select('*').eq('company_id', company.id).eq('is_wasted', true).limit(5),
    admin.from('ga4_snapshots').select('*').eq('company_id', company.id).order('synced_at', { ascending: false }).limit(1).single(),
    admin.from('google_connections').select('sc_site_url, gbp_location_id').eq('company_id', company.id).single(),
  ])

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key') {
    return NextResponse.json({ actions: MOCK_ACTIONS })
  }

  // Detect market: stored country wins, then SC domain + keywords as fallback
  const keywords = (scQueries ?? []).map(q => q.query)
  const market   = detectMarket(company.country ?? null, conn?.sc_site_url ?? '', keywords)

  // Build data context
  const nearMiss   = (scQueries ?? []).filter(q => q.position >= 4 && q.position <= 15)
  const notRanking = (scQueries ?? []).filter(q => q.position > 20 && q.impressions > 100)
  const avgCTR     = (scQueries ?? []).length > 0
    ? (scQueries ?? []).reduce((s, q) => s + Number(q.ctr), 0) / (scQueries ?? []).length : 0
  const lowCTR = (scQueries ?? []).filter(q => q.position <= 5 && Number(q.ctr) < avgCTR * 0.5)

  // Build a precise location string: "Hägersten, 12660 Stockholm, Sweden"
  // or just "Stockholm, Sweden" if no district, or just "Sweden" if no city yet
  const locationParts: string[] = []
  if (company.city)        locationParts.push(company.city)
  if (company.postal_code) locationParts.push(company.postal_code)
  if (market.country !== 'your market') locationParts.push(market.country)
  const locationStr = locationParts.join(', ') || market.country

  const now     = new Date()
  const month   = now.toLocaleString('en-GB', { month: 'long' })
  const context = `
Business: ${company.name}
Location: ${locationStr}
Current month: ${month}

BENCHMARK SCORES (/100):
Overall ${scores?.overall_score ?? 'N/A'} | Reputation ${scores?.reputation_score ?? 'N/A'} | Visibility ${scores?.visibility_score ?? 'N/A'} | Engagement ${scores?.engagement_score ?? 'N/A'} | Content ${scores?.content_score ?? 'N/A'} | Conversion ${scores?.conversion_score ?? 'N/A'}

GOOGLE BUSINESS PROFILE (last 30 days):
Reviews: ${snapshot?.review_count ?? 'N/A'} total, avg rating ${snapshot?.rating ?? 'N/A'}/5
Replied to: ${snapshot?.reviews_responded ?? 'N/A'} of ${snapshot?.review_count ?? 'N/A'} reviews
Profile impressions: ${snapshot?.impressions_last_30_days ?? 'N/A'}
Website clicks from GBP: ${snapshot?.website_clicks ?? 'N/A'}
Direction requests: ${snapshot?.direction_requests ?? 'N/A'}
GBP location connected: ${conn?.gbp_location_id ? 'Yes' : 'No'}

SEARCH CONSOLE (${scQueries?.length ?? 0} keywords tracked):
Near miss – pos 4–15 (quick wins): ${nearMiss.slice(0, 5).map(q => `"${q.query}" #${Math.round(q.position)} (${q.impressions} impr/mo, ${(Number(q.ctr) * 100).toFixed(1)}% CTR)`).join(' | ') || 'none'}
Weak rankings – pos >20 but high impressions: ${notRanking.slice(0, 3).map(q => `"${q.query}" #${Math.round(q.position)} (${q.impressions} impr/mo)`).join(' | ') || 'none'}
Low CTR despite ranking in top 5: ${lowCTR.slice(0, 3).map(q => `"${q.query}" only ${(Number(q.ctr) * 100).toFixed(1)}% CTR at #${Math.round(q.position)}`).join(' | ') || 'none'}

GOOGLE ADS – zero-conversion wasted spend:
${wastedKeywords?.map(k => `"${k.keyword}": ${(Number(k.spend_micros) / 1_000_000).toFixed(0)} ${market.currency} spent, ${k.clicks} clicks, 0 conversions`).join('\n') || 'None or not connected'}

GA4 WEBSITE ANALYTICS (last 30 days):
Sessions: ${ga4?.sessions ?? 'not connected'} | Engagement rate: ${ga4?.engagement_rate ? `${Math.round(Number(ga4.engagement_rate) * 100)}%` : 'N/A'} | Conversions: ${ga4?.conversions ?? 'N/A'}
`.trim()

  try {
    const client = new Anthropic({ apiKey })

    // ── Step 1: Generate initial plan ────────────────────────────────────────
    const step1 = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 2500,
      system:     market.persona,
      messages: [{
        role:    'user',
        content: `Based on the business data below, generate the 5 highest-impact actions this business should take RIGHT NOW. Use your expertise in ${market.country} and the benchmarks below to judge what is good, average, or poor performance.

${market.benchmarks}

BUSINESS DATA:
${context}

Respond ONLY with valid JSON — no markdown, no preamble:
{
  "actions": [
    {
      "priority": 1,
      "category": "Reviews|SEO|Ads|Photos|Analytics|GBP",
      "title": "Concise action title (max 8 words)",
      "description": "Exactly what to do, step by step. Reference specific keywords, scores, or numbers from the data. (2–3 sentences)",
      "impact": "Specific expected result, quantified where possible. Reference market benchmarks. (1–2 sentences)",
      "timeEstimate": "Realistic time, e.g. '15 minutes', '1 hour', '2–3 hours'"
    }
  ]
}

Rules:
- Order by urgency × impact — biggest quick wins first
- Every recommendation must cite a specific data point from the business data
- Never give generic advice that could apply to any business
- Reference the current month (${month}) if seasonal relevance exists
- Use the exact location (${locationStr}) in keyword and SEO recommendations — prefer the most precise geographic level (district/neighbourhood over city) where it makes strategic sense`,
      }],
    })

    const step1Text    = step1.content[0].type === 'text' ? step1.content[0].text : ''
    const initialPlan  = parseActions(step1Text)
    if (!initialPlan) return NextResponse.json({ actions: MOCK_ACTIONS })

    // ── Step 2: Critique and sharpen ─────────────────────────────────────────
    const step2 = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 2500,
      system:     'You are a ruthless quality reviewer for local business marketing advice. Your only job is to ensure every recommendation is specific, data-backed, and genuinely expert — not generic advice a random person could give. You have zero tolerance for vague statements.',
      messages: [{
        role:    'user',
        content: `Review this action plan for ${company.name} in ${market.country}.

For EACH action, check:
1. Does it reference a specific number, keyword, or data point from the business data? If not — rewrite it so it does.
2. Is the impact claim quantified or tied to a real benchmark? If not — add a specific figure.
3. Is the description concrete enough that the business owner knows EXACTLY what to click, where to go, and what to change? If not — make it more specific.
4. Is it actually the highest-impact action available given the data, or is there something more impactful being overlooked?

BUSINESS DATA:
${context}

MARKET BENCHMARKS:
${market.benchmarks}

PLAN TO REVIEW:
${JSON.stringify({ actions: initialPlan }, null, 2)}

If an action is already excellent and specific, keep it exactly as is. Only rewrite actions that are too vague or could be more impactful. Return the final polished plan in the exact same JSON format — no explanations, just the JSON.`,
      }],
    })

    const step2Text   = step2.content[0].type === 'text' ? step2.content[0].text : ''
    const finalPlan   = parseActions(step2Text)

    return NextResponse.json({ actions: finalPlan ?? initialPlan })

  } catch {
    return NextResponse.json({ actions: MOCK_ACTIONS })
  }
}
