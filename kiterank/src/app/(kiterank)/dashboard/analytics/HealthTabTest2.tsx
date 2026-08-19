'use client'
import { useState, useEffect } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang, type Lang } from '@/components/LanguageProvider'
import { type VitalsSet, type IndexingData } from './types'
import { RatingBadge } from './charts'
import { type HealthCheckResult } from '@/app/api/health-check/route'

// ─── Core Web Vitals config ───────────────────────────────────────────────────
const VITALS: { key: keyof Omit<VitalsSet, 'score'>; label: string; name: string; tooltipSv: string; tooltipEn: string; threshold: string }[] = [
  { key: 'lcp',  label: 'LCP',  name: 'Largest Contentful Paint', threshold: '< 2.5 s',
    tooltipEn: 'How long it takes for the main content of the page to appear on screen. This is Google\'s most important speed metric for rankings and the one visitors notice most. Under 2.5 seconds is good.',
    tooltipSv: 'Hur lång tid det tar innan sidans huvudinnehåll syns på skärmen. Detta är Googles viktigaste hastighetsmått för rankning och det besökarna märker mest. Under 2,5 sekunder är bra.' },
  { key: 'inp',  label: 'INP',  name: 'Interaction to Next Paint', threshold: '< 200 ms',
    tooltipEn: 'How quickly the page responds when someone clicks or taps something. Under 200 milliseconds feels instant. Slow responses frustrate visitors and increase the chance they leave.',
    tooltipSv: 'Hur snabbt sidan reagerar när någon klickar eller trycker på något. Under 200 millisekunder känns direkt. Långsamma svar irriterar besökare och ökar risken att de lämnar.' },
  { key: 'cls',  label: 'CLS',  name: 'Cumulative Layout Shift',   threshold: '< 0.1',
    tooltipEn: 'How much content jumps around while the page loads — buttons or text that move before someone can click them. Below 0.1 means the page is visually stable.',
    tooltipSv: 'Hur mycket innehållet hoppar runt medan sidan laddas — knappar eller text som flyttar sig innan man hinner klicka. Under 0,1 betyder att sidan är visuellt stabil.' },
  { key: 'fcp',  label: 'FCP',  name: 'First Contentful Paint',    threshold: '< 1.8 s',
    tooltipEn: 'How quickly the visitor first sees any content — text or an image — after clicking a link. Under 1.8 seconds is good. A faster first paint feels more responsive.',
    tooltipSv: 'Hur snabbt besökaren först ser något innehåll — text eller en bild — efter att ha klickat på en länk. Under 1,8 sekunder är bra. Ju snabbare, desto piggare känns sidan.' },
  { key: 'ttfb', label: 'TTFB', name: 'Time to First Byte',        threshold: '< 800 ms',
    tooltipEn: 'How fast the web server responds to the initial request. This reflects hosting quality. Under 800 milliseconds is good — slower values often mean the server is overloaded or far from visitors.',
    tooltipSv: 'Hur snabbt webbservern svarar på den första förfrågan. Detta speglar kvaliteten på ditt webbhotell. Under 800 millisekunder är bra — långsammare värden betyder ofta att servern är överbelastad eller långt från besökarna.' },
]

// ─── Mock data ────────────────────────────────────────────────────────────────
const HEALTH_MOCK: { mobile: VitalsSet; desktop: VitalsSet; indexing: IndexingData } = {
  mobile: {
    score: 68,
    lcp:   { value: '3.4 s',  rating: 'needs-improvement' },
    inp:   { value: '180 ms', rating: 'good'               },
    cls:   { value: '0.05',   rating: 'good'               },
    fcp:   { value: '2.1 s',  rating: 'needs-improvement'  },
    ttfb:  { value: '0.62 s', rating: 'good'               },
  },
  desktop: {
    score: 91,
    lcp:   { value: '1.2 s',  rating: 'good' },
    inp:   { value: '80 ms',  rating: 'good' },
    cls:   { value: '0.03',   rating: 'good' },
    fcp:   { value: '0.8 s',  rating: 'good' },
    ttfb:  { value: '0.48 s', rating: 'good' },
  },
  indexing: {
    indexed:      14,
    errors:        2,
    excluded:      4,
    mobileIssues:  0,
    errorPages: [
      { url: '/services/old-heating-repair', reason: 'Not found (404) — this page no longer exists but Google keeps trying to visit it. Add a redirect to a relevant page or remove any remaining links to it.' },
      { url: '/blog/emergency-plumber-tips', reason: 'Removed page — was previously in Google\'s index but is now gone with no redirect. Any ranking this page had is being lost.' },
    ],
    excludedPages: [
      { url: '/services/drain-cleaning-old', reason: 'Duplicate page — Google found this page has the same content as another page on your site and decided to only show the other version. Consider redirecting this URL to the main one.' },
      { url: '/?s=plumber',                  reason: 'Internal search result page — Google does not index pages showing your own site\'s search results. This is normal and expected; no action needed.' },
      { url: '/tag/emergency-plumber',        reason: 'Thin content page — a blog tag page containing very little unique content. Google chose not to index it. This is usually fine unless you want the tag to rank.' },
      { url: '/page/2',                       reason: 'Pagination page — the second page of your blog archive. Google sometimes skips these when the content is already covered by the individual posts.' },
    ],
  },
}

// Swedish versions of the mock indexing explanations, keyed by URL so the
// mock data shape stays untouched.
const REASON_SV: Record<string, string> = {
  '/services/old-heating-repair': 'Hittades inte (404) — sidan finns inte längre men Google fortsätter försöka besöka den. Lägg till en omdirigering till en relevant sida eller ta bort länkar som pekar hit.',
  '/blog/emergency-plumber-tips': 'Borttagen sida — fanns tidigare i Googles index men är nu borta utan omdirigering. Den rankning sidan hade går förlorad.',
  '/services/drain-cleaning-old': 'Dubblettsida — Google såg att sidan har samma innehåll som en annan sida på din webbplats och valde att bara visa den andra versionen. Överväg att omdirigera denna adress till huvudsidan.',
  '/?s=plumber':                  'Intern söksida — Google indexerar inte sidor som visar din egen webbplats sökresultat. Detta är helt normalt; inget behöver göras.',
  '/tag/emergency-plumber':       'Sida med tunt innehåll — en etikettsida från bloggen med väldigt lite unikt innehåll. Google valde att inte indexera den. Det är oftast helt okej, om du inte vill att etiketten ska ranka.',
  '/page/2':                      'Sidnumreringssida — andra sidan i ditt bloggarkiv. Google hoppar ibland över dessa när innehållet redan täcks av de enskilda inläggen.',
}

// ─── Health check types ───────────────────────────────────────────────────────
type CheckStatus = 'pass' | 'warn' | 'fail'

interface Check {
  id:     string
  label:  string
  status: CheckStatus
  detail: string
  tip:    string
  fix?:   string
}

interface Group { title: string; checks: Check[] }

function evaluate(r: HealthCheckResult, lang: Lang): Group[] {
  const sv = lang === 'sv'
  const chars   = (n: number) => sv ? `${n} tecken` : `${n} characters`
  const missing = sv ? 'Saknas' : 'Missing'
  return [
    {
      title: sv ? 'SEO-grunder' : 'SEO basics',
      checks: [
        {
          id:     'title',
          label:  sv ? 'Sidtitel' : 'Page title',
          status: !r.title ? 'fail' : r.titleLen < 30 || r.titleLen > 65 ? 'warn' : 'pass',
          detail: r.title ? chars(r.titleLen) : missing,
          tip:    sv
            ? 'Google visar din titel i sökresultaten. 50–60 tecken med din tjänst och stad är perfekt.'
            : 'Google shows your title in search results. 50–60 characters including your service and city is ideal.',
          fix:    !r.title
            ? (sv
              ? 'Leta upp fältet för sidtitel i din hemsideredigerare eller CMS-inställningar och lägg till en. Ta med din huvudtjänst och din stad, och håll den under 60 tecken.'
              : 'Find the page title field in your website editor or CMS settings and add one. Include your main service and city name, keeping it under 60 characters.')
            : (sv
              ? 'Ändra sidtiteln i din hemsida eller ditt CMS. Sikta på 50–60 tecken — ta med din tjänst och staden du jobbar i.'
              : 'Edit the page title in your website or CMS settings. Aim for 50–60 characters — include your service and the city you work in.'),
        },
        {
          id:     'description',
          label:  sv ? 'Metabeskrivning' : 'Meta description',
          status: !r.description ? 'fail' : r.descLen < 100 || r.descLen > 160 ? 'warn' : 'pass',
          detail: r.description ? chars(r.descLen) : missing,
          tip:    sv
            ? 'Visas under din titel i sökresultaten. Saknas den skriver Google en egen — ofta dålig.'
            : 'Shown below your title in search results. Missing means Google writes its own, often poorly.',
          fix:    !r.description
            ? (sv
              ? 'Leta upp fältet för metabeskrivning i din hemsideredigerare eller SEO-inställningar och lägg till en. Skriv 1–2 meningar om vad du gör och var, mellan 130–160 tecken.'
              : 'Find the meta description field in your website editor or SEO settings and add one. Write 1–2 sentences describing what you do and where, between 130–160 characters.')
            : (sv
              ? 'Ändra metabeskrivningen i din hemsida eller dina SEO-inställningar. Sikta på 130–160 tecken — beskriv tydligt din tjänst och var du finns.'
              : 'Edit your meta description in your website or SEO settings. Aim for 130–160 characters — describe your service and location clearly.'),
        },
        {
          id:     'h1',
          label:  sv ? 'Huvudrubrik (H1)' : 'Main heading (H1)',
          status: r.h1Count === 0 ? 'fail' : r.h1Count > 1 ? 'warn' : 'pass',
          detail: r.h1Count === 0
            ? missing
            : r.h1Count === 1
            ? (r.h1Text ?? (sv ? '1 hittad' : '1 found'))
            : (sv ? `${r.h1Count} rubriker — bör vara 1` : `${r.h1Count} headings — should be 1`),
          tip:    sv
            ? 'Varje sida ska ha exakt en H1. Den berättar för Google vad sidan handlar om.'
            : 'Every page should have exactly one H1. It tells Google what the page is about.',
          fix:    r.h1Count === 0
            ? (sv
              ? 'Be din webbutvecklare lägga till en huvudrubrik på sidan — oftast den största texten högst upp som beskriver vad företaget gör.'
              : 'Ask your web developer to add a main heading to the page — usually the largest text at the top describing what the business does.')
            : (sv
              ? 'Be din webbutvecklare ta bort de extra rubrikerna. Bara en H1 ska finnas per sida.'
              : 'Ask your web developer to remove the extra headings. Only one H1 should appear per page.'),
        },
        {
          id:     'og',
          label:  sv ? 'Delningstaggar för sociala medier' : 'Social sharing tags',
          status: r.hasOgTitle && r.hasOgDesc ? 'pass' : 'warn',
          detail: r.hasOgTitle && r.hasOgDesc
            ? (sv ? 'Titel + beskrivning satta' : 'Title + description set')
            : r.hasOgTitle
            ? (sv ? 'Endast titel — beskrivning saknas' : 'Title only — description missing')
            : (sv ? 'Inte konfigurerat' : 'Not configured'),
          tip:    sv
            ? 'Styr hur din sida ser ut när den delas på Facebook, WhatsApp eller LinkedIn.'
            : 'Controls how your page looks when shared on Facebook, WhatsApp, or LinkedIn.',
          fix:    sv
            ? 'Ange en delningstitel och beskrivning i hemsidans SEO-inställningar. I WordPress sköter Yoast eller RankMath detta under fliken Social.'
            : 'Set a sharing title and description in your website\'s SEO settings. In WordPress, the Yoast or RankMath plugin handles this under the Social tab.',
        },
      ],
    },
    {
      title: sv ? 'Lokala signaler' : 'Local signals',
      checks: [
        {
          id:     'schema',
          label:  sv ? 'LocalBusiness-märkning' : 'LocalBusiness markup',
          status: r.hasLocalBusinessSchema ? 'pass' : 'fail',
          detail: r.hasLocalBusinessSchema
            ? `${sv ? 'Hittad' : 'Found'} — ${r.schemaTypes.filter((t, i, a) => a.indexOf(t) === i).join(', ')}`
            : (sv ? 'Hittades inte' : 'Not found'),
          tip:    sv
            ? 'Strukturerad data som berättar för Google vilken typ av företag du är, din adress, ditt telefonnummer och dina öppettider — används direkt i lokala sökningar.'
            : 'Structured data that tells Google your business type, address, phone and hours — used directly for local search.',
          fix:    sv
            ? 'Be din webbutvecklare lägga till strukturerad LocalBusiness-data på din startsida. Använder du WordPress kan tillägg som Yoast SEO eller Schema Pro lägga till detta utan att röra någon kod.'
            : 'Ask your web developer to add LocalBusiness structured data to your homepage. If you use WordPress, plugins like Yoast SEO or Schema Pro can add this without touching any code.',
        },
        {
          id:     'phone',
          label:  sv ? 'Klickbart telefonnummer' : 'Tap-to-call phone link',
          status: r.hasPhoneLink ? 'pass' : 'warn',
          detail: r.hasPhoneLink ? (r.phoneNumber ?? (sv ? 'Hittad' : 'Found')) : (sv ? 'Hittades inte' : 'Not found'),
          tip:    sv
            ? 'En klickbar telefonlänk låter mobilbesökare ringa dig med ett tryck — avgörande för tjänsteföretag.'
            : 'A clickable tel: link lets mobile visitors call you in one tap — critical for service businesses.',
          fix:    sv
            ? 'Be din webbutvecklare göra ditt telefonnummer klickbart på mobilen. Det ska öppna telefonappen direkt vid tryck — en enkel ändring som tar några minuter.'
            : 'Ask your web developer to make your phone number clickable on mobile. It should open the phone app directly when tapped — a simple change that takes a few minutes.',
        },
        {
          id:     'canonical',
          label:  sv ? 'Kanonisk adress' : 'Canonical URL',
          status: r.canonical ? 'pass' : 'warn',
          detail: r.canonical ?? (sv ? 'Inte satt' : 'Not set'),
          tip:    sv
            ? 'Berättar för Google vilken version av en adress som är originalet — förhindrar problem med dubblerat innehåll.'
            : 'Tells Google which version of a URL is the original — prevents duplicate content issues.',
          fix:    sv
            ? 'Be din utvecklare lägga till en kanonisk tagg på startsidan. De flesta SEO-tillägg för WordPress sköter detta automatiskt när de väl är installerade.'
            : 'Ask your developer to add a canonical tag to your homepage. Most SEO plugins for WordPress handle this automatically once installed.',
        },
      ],
    },
    {
      title: sv ? 'Tekniskt' : 'Technical',
      checks: [
        {
          id:     'https',
          label:  sv ? 'Säker anslutning (HTTPS)' : 'Secure connection (HTTPS)',
          status: r.isHttps ? 'pass' : 'fail',
          detail: r.isHttps ? (sv ? 'Aktiv' : 'Active') : (sv ? 'Endast HTTP — inte säker' : 'HTTP only — not secure'),
          tip:    sv
            ? 'HTTPS är en rankningssignal och webbläsare visar en varning på sidor utan HTTPS.'
            : 'HTTPS is a ranking signal and browsers show a warning on non-HTTPS sites.',
          fix:    sv
            ? 'Kontakta ditt webbhotell och be dem aktivera HTTPS med ett SSL-certifikat. De flesta webbhotell har detta gratis och kan aktivera det på under en timme.'
            : 'Contact your web host and ask them to enable HTTPS with an SSL certificate. Most hosts include this for free and can activate it in under an hour.',
        },
        {
          id:     'viewport',
          label:  sv ? 'Mobilanpassning (viewport)' : 'Mobile viewport',
          status: r.hasViewport ? 'pass' : 'fail',
          detail: r.hasViewport ? (sv ? 'Konfigurerad' : 'Configured') : missing,
          tip:    sv
            ? 'Utan en viewport-tagg visas din sida som en datorsida på mobilen — texten blir pytteliten och layouten går sönder.'
            : 'Without a viewport tag your site renders as a desktop page on mobile — text becomes tiny, layouts break.',
          fix:    sv
            ? 'Be din webbutvecklare lägga till en viewport-tagg i sidhuvudet. Det är en enradsfix som gör att sidan visas rätt på alla skärmstorlekar.'
            : 'Ask your web developer to add a viewport meta tag to the site header. It\'s a one-line fix that makes the site display correctly on all screen sizes.',
        },
        {
          id:     'images',
          label:  sv ? 'Bildbeskrivningar (alt-text)' : 'Image alt text',
          status: r.imgTotal === 0 ? 'pass' : r.imgNoAlt === 0 ? 'pass' : r.imgNoAlt <= 2 ? 'warn' : 'fail',
          detail: r.imgTotal === 0
            ? (sv ? 'Inga bilder hittades' : 'No images found')
            : r.imgNoAlt === 0
            ? (sv ? `Alla ${r.imgTotal} bilder OK` : `All ${r.imgTotal} images OK`)
            : (sv ? `${r.imgNoAlt} av ${r.imgTotal} saknar beskrivning` : `${r.imgNoAlt} of ${r.imgTotal} missing descriptions`),
          tip:    sv
            ? 'Alt-text hjälper Google förstå dina bilder och gör sidan tillgänglig för besökare med skärmläsare.'
            : 'Alt text helps Google understand your images and improves accessibility for visitors using screen readers.',
          fix:    sv
            ? 'I de flesta hemsideredigerare kan du klicka på en bild och lägga till en beskrivning (kallas alt-text). Skriv en kort mening om vad varje bild visar. Fråga din utvecklare om du inte hittar var.'
            : 'In most website editors you can click an image and add a description (called alt text). For each image, write a short sentence describing what it shows. Ask your developer if you\'re unsure where to find this.',
        },
      ],
    },
  ]
}

const STATUS_ICON:  Record<CheckStatus, string> = { pass: '✓', warn: '!', fail: '✕' }
const STATUS_COLOR: Record<CheckStatus, string> = {
  pass: 'text-green-400 bg-green-500/10 border-green-500/20',
  warn: 'text-mustard  bg-mustard/10   border-mustard/20',
  fail: 'text-red-400  bg-red-500/10   border-red-500/20',
}
const STATUS_DOT: Record<CheckStatus, string> = {
  pass: 'bg-green-400',
  warn: 'bg-mustard',
  fail: 'bg-red-400',
}

const T = {
  sv: {
    diagTitle:      'Diagnos av startsidan',
    diagTip:        'En livekoll av din faktiska startsida — SEO-grunder, lokala signaler och teknisk uppsättning, var och en med en konkret åtgärd.',
    rerun:          'Kör igen',
    analysing:      (url: string) => `Analyserar ${url}…`,
    genericError:   'Något gick fel.',
    checkError:     'Kunde inte köra kontrollen.',
    checksPassing:  'kontroller godkända',
    issuesToFix:    (n: number) => `${n} problem att åtgärda`,
    howToFix:       'Så fixar du det:',
    speedTitle:     'Hastighet',
    speedTip:       'Hur snabbt din hemsida laddar, betygsatt 0–100 av Googles PageSpeed-verktyg — samma poäng som Google väger in i sökrankningen. 90+ är bra, 50–89 behöver förbättras, under 50 är dåligt.',
    mobile:         'Mobil',
    desktop:        'Dator',
    mobileScoreTip:  'Hastigheten i mobilen, 0–100. Viktigast av de två — Google utgår från mobilversionen när de rankar dig.',
    desktopScoreTip: 'Hastigheten på dator, 0–100. Väger mindre än mobilpoängen men bör också vara grön.',
    speedGood:      'Din sida är snabb på mobilen — det hjälper både rankning och besökare.',
    speedMid:       'Din mobilsida är långsammare än den borde vara — långsamma sidor tappar besökare innan de ens sett ditt innehåll.',
    speedBad:       'Din mobilsida är väldigt långsam — det kostar dig aktivt besökare och rankning.',
    mobileFirst:    'Google utgår främst från mobilversionen av din sida när de bestämmer var du ska ranka.',
    techDetails:    'Tekniska detaljer',
    metric:         'Mätvärde',
    goodIf:         'Bra om',
    goodIfTip:      "Gränsvärdet Google använder för att klassa ett resultat som 'Bra'. Värden över detta flaggas som i behov av förbättring eller dåliga.",
    indexTitle:     'Indexering & täckning',
    indexTip:       'Från Google Search Console — hur många av dina sidor Google hittat och indexerat, och om några har fel som stoppar dem från att synas i sökresultaten.',
    cPagesIndexed:  'Indexerade sidor',
    cPagesIndexedTip: 'Hur många av dina sidor Google lagt till i sitt sökindex. Bara indexerade sidor kan synas i sökresultaten.',
    cErrors:        'Indexeringsfel',
    cErrorsTip:     'Sidor Google försökte besöka men inte kunde indexera — till exempel för att sidan inte längre finns (404) eller var blockerad. Dessa bör åtgärdas.',
    cExcluded:      'Exkluderade sidor',
    cExcludedTip:   'Sidor Google valde att inte indexera — dubbletter, noindex-sidor eller sidor med signaler som ber Google hoppa över dem. Vissa exkluderingar är helt normala och avsiktliga.',
    cMobileIssues:  'Mobilproblem',
    cMobileIssuesTip: 'Sidor som har problem på mobiler — som text som är för liten att läsa eller länkar som sitter för tätt för att trycka på. Detta kan skada sökrankningen.',
    errorPagesTitle: 'Sidor med indexeringsfel',
    errorPagesTip:  'Dessa sidor har problem som hindrar Google från att indexera dem. Till skillnad från exkluderade sidor är detta riktiga fel som bör åtgärdas — annars kan sidorna inte synas i sökresultaten.',
    excludedTitle:  'Varför sidor exkluderades',
    excludedTip:    'Exkluderade sidor är inte fel — Google hittade dem men valde att inte indexera dem. Vissa orsaker är helt normala (som interna söksidor). Andra kan vara värda att fixa beroende på om du vill att sidorna ska synas i Googles sökresultat.',
  },
  en: {
    diagTitle:      'Homepage diagnosis',
    diagTip:        'A live check of your actual homepage — SEO basics, local signals, and technical setup, each with a concrete fix.',
    rerun:          'Re-run',
    analysing:      (url: string) => `Analysing ${url}…`,
    genericError:   'Something went wrong.',
    checkError:     'Could not run the check.',
    checksPassing:  'checks passing',
    issuesToFix:    (n: number) => `${n} issue${n > 1 ? 's' : ''} to fix`,
    howToFix:       'How to fix:',
    speedTitle:     'Speed',
    speedTip:       "How fast your website loads, scored 0–100 by Google's PageSpeed tool — the same score Google factors into search rankings. 90+ is good, 50–89 needs improvement, below 50 is poor.",
    mobile:         'Mobile',
    desktop:        'Desktop',
    mobileScoreTip:  'Your speed on mobile, scored 0–100. The most important of the two — Google ranks you based on the mobile version.',
    desktopScoreTip: 'Your speed on desktop, scored 0–100. Less important than the mobile score, but it should also be green.',
    speedGood:      'Your site is fast on mobile — this helps both rankings and visitors.',
    speedMid:       'Your mobile site is slower than it should be — slow pages lose visitors before they even see your content.',
    speedBad:       'Your mobile site is very slow — this is actively costing you visitors and rankings.',
    mobileFirst:    'Google mainly uses the mobile version of your site when deciding where to rank you.',
    techDetails:    'Technical details',
    metric:         'Metric',
    goodIf:         'Good if',
    goodIfTip:      "The threshold Google uses to classify a result as 'Good'. Values above this are flagged as needing improvement or poor.",
    indexTitle:     'Indexing & coverage',
    indexTip:       'From Google Search Console — how many of your pages Google has found and indexed, and whether any have errors stopping them from appearing in search results.',
    cPagesIndexed:  'Pages indexed',
    cPagesIndexedTip: 'How many of your pages Google has successfully added to its search index. Only indexed pages can appear in search results.',
    cErrors:        'Indexing errors',
    cErrorsTip:     'Pages Google tried to visit but could not index — for example because the page no longer exists (404) or access was blocked. These should be fixed.',
    cExcluded:      'Excluded pages',
    cExcludedTip:   'Pages Google chose not to index — duplicates, noindex pages, or pages with signals telling Google to skip them. Some exclusions are normal and intentional.',
    cMobileIssues:  'Mobile usability issues',
    cMobileIssuesTip: 'Pages that have problems on phones — like text too small to read or links too close together to tap. These can hurt search rankings.',
    errorPagesTitle: 'Pages with indexing errors',
    errorPagesTip:  'These pages have problems that prevent Google from indexing them. Unlike excluded pages, these are actual errors that should be fixed — otherwise those pages cannot appear in search results.',
    excludedTitle:  'Why pages were excluded',
    excludedTip:    'Excluded pages are not errors — Google found them but chose not to index them. Some reasons are completely normal (like internal search pages). Others might be worth fixing depending on whether you want those pages to appear in Google search results.',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HealthTabTest2({ websiteUrl }: { websiteUrl: string }) {
  const { mobile, desktop, indexing } = HEALTH_MOCK
  const { lang } = useLang()
  const t = T[lang]
  const [showVitals, setShowVitals] = useState(false)

  const reasonFor = (url: string, reason: string) =>
    lang === 'sv' ? (REASON_SV[url] ?? reason) : reason

  const indexingCards = [
    { label: t.cPagesIndexed, tooltip: t.cPagesIndexedTip, value: indexing.indexed,      color: 'text-white',     border: 'border-navy-700'      },
    { label: t.cErrors,       tooltip: t.cErrorsTip,       value: indexing.errors,       color: indexing.errors       > 0 ? 'text-red-400' : 'text-white', border: indexing.errors       > 0 ? 'border-red-500/30' : 'border-navy-700' },
    { label: t.cExcluded,     tooltip: t.cExcludedTip,     value: indexing.excluded,     color: 'text-slate-400', border: 'border-navy-700'      },
    { label: t.cMobileIssues, tooltip: t.cMobileIssuesTip, value: indexing.mobileIssues, color: indexing.mobileIssues > 0 ? 'text-red-400' : 'text-white', border: indexing.mobileIssues > 0 ? 'border-red-500/30' : 'border-navy-700' },
  ]

  // Health check state — auto-runs on mount
  const [checkStatus, setCheckStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [result,      setResult]      = useState<HealthCheckResult | null>(null)
  const [errMsg,      setErrMsg]      = useState<string | null>(null)

  async function runCheck() {
    setCheckStatus('loading')
    setResult(null)
    setErrMsg(null)
    try {
      const res  = await fetch('/api/health-check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: websiteUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg(data.error ?? t.genericError); setCheckStatus('error'); return }
      setResult(data)
      setCheckStatus('done')
    } catch {
      setErrMsg(t.checkError)
      setCheckStatus('error')
    }
  }

  useEffect(() => { runCheck() }, [])

  const groups    = result ? evaluate(result, lang) : null
  const allChecks = groups?.flatMap(g => g.checks) ?? []
  const passing   = allChecks.filter(c => c.status === 'pass').length
  const total     = allChecks.length

  // One plain-language speed verdict instead of leading with raw metrics
  const speedVerdict =
    mobile.score >= 90 ? { text: t.speedGood, color: 'text-green-400' } :
    mobile.score >= 50 ? { text: t.speedMid,  color: 'text-mustard' } :
    { text: t.speedBad, color: 'text-red-400' }

  return (
    <>
      {/* ── Homepage diagnosis — the live check leads the tab ─────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Tooltip text={t.diagTip}>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">{t.diagTitle}</h2>
          </Tooltip>
          {checkStatus !== 'loading' && (
            <button
              onClick={runCheck}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t.rerun}
            </button>
          )}
        </div>

        {/* Loading */}
        {checkStatus === 'loading' && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-mustard border-t-transparent animate-spin" />
            <p className="text-slate-400 text-sm">{t.analysing(websiteUrl)}</p>
          </div>
        )}

        {/* Error */}
        {checkStatus === 'error' && (
          <div className="bg-navy-800 rounded-xl border border-red-500/20 px-5 py-4">
            <p className="text-red-400 text-sm">{errMsg}</p>
          </div>
        )}

        {/* Results */}
        {checkStatus === 'done' && result && groups && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-4 flex items-center gap-4 sm:gap-6 flex-wrap">
              <div>
                <p className="text-white text-2xl font-bold tabular-nums">{passing}<span className="text-slate-500 text-base font-normal">/{total}</span></p>
                <p className="text-slate-500 text-xs mt-0.5">{t.checksPassing}</p>
              </div>
              <div className="h-8 w-px bg-navy-700 hidden sm:block" />
              <div className="flex-1 min-w-[160px]">
                <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                  {allChecks.map(c => (
                    <div key={c.id} className={`flex-1 ${STATUS_DOT[c.status]}`} />
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-1.5 truncate">{result.url}</p>
              </div>
              {allChecks.some(c => c.status === 'fail') && (
                <p className="text-red-400 text-xs font-medium shrink-0">
                  {t.issuesToFix(allChecks.filter(c => c.status === 'fail').length)}
                </p>
              )}
            </div>

            {/* Check groups */}
            {groups.map(group => (
              <div key={group.title}>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">{group.title}</p>
                <div className="space-y-2">
                  {group.checks.map(check => (
                    <div key={check.id} className={`bg-navy-800 rounded-xl border px-5 py-4 flex items-start gap-4 ${
                      check.status === 'fail' ? 'border-red-500/20' :
                      check.status === 'warn' ? 'border-mustard/20' :
                      'border-navy-700'
                    }`}>
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${STATUS_COLOR[check.status]}`}>
                        {STATUS_ICON[check.status]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <p className="text-white text-sm font-medium">{check.label}</p>
                          <p className={`text-xs font-medium ${
                            check.status === 'pass' ? 'text-green-400' :
                            check.status === 'warn' ? 'text-mustard'   :
                            'text-red-400'
                          }`}>{check.detail}</p>
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{check.tip}</p>
                        {check.status !== 'pass' && check.fix && (
                          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                            <span className="text-slate-500 font-medium">{t.howToFix} </span>{check.fix}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Speed ─────────────────────────────────────────────────────────── */}
      <div>
        <Tooltip text={t.speedTip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{t.speedTitle}</h2>
        </Tooltip>
        <div className="bg-navy-800 rounded-xl border border-navy-700 p-6">
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { label: t.mobile,  score: mobile.score,  tip: t.mobileScoreTip  },
              { label: t.desktop, score: desktop.score, tip: t.desktopScoreTip },
            ].map(s => {
              const color = s.score >= 90 ? 'text-green-400' : s.score >= 50 ? 'text-mustard' : 'text-red-400'
              const bar   = s.score >= 90 ? 'bg-green-400'   : s.score >= 50 ? 'bg-mustard'   : 'bg-red-400'
              return (
                <div key={s.label} className="w-32 shrink-0">
                  <Tooltip text={s.tip}>
                    <p className="text-slate-500 text-xs mb-1 cursor-default">{s.label}</p>
                  </Tooltip>
                  <p className={`text-3xl font-bold tabular-nums ${color}`}>{s.score}<span className="text-slate-500 text-base font-normal">/100</span></p>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${bar}`} style={{ width: `${s.score}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="flex-1 min-w-[220px]">
              <p className={`text-sm font-medium leading-relaxed ${speedVerdict.color}`}>{speedVerdict.text}</p>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{t.mobileFirst}</p>
            </div>
          </div>

          {/* Technical details — collapsed by default */}
          <div className="mt-5 pt-4 border-t border-navy-700">
            <button
              onClick={() => setShowVitals(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showVitals ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {t.techDetails}
            </button>

            {showVitals && (
              <div className="mt-3 overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[1fr_110px_110px_80px] gap-3 px-4 py-2 text-xs text-slate-500 font-medium border-b border-navy-700">
                    <span>{t.metric}</span>
                    <span className="text-center">{t.mobile}</span>
                    <span className="text-center">{t.desktop}</span>
                    <Tooltip text={t.goodIfTip}>
                      <span className="text-center cursor-default">{t.goodIf}</span>
                    </Tooltip>
                  </div>
                  <div className="divide-y divide-navy-700">
                    {VITALS.map(v => (
                      <div key={v.key} className="grid grid-cols-[1fr_110px_110px_80px] gap-3 px-4 py-3 items-center">
                        <Tooltip text={lang === 'sv' ? v.tooltipSv : v.tooltipEn}>
                          <div className="cursor-default">
                            <span className="text-white text-sm font-medium">{v.label}</span>
                            <span className="text-slate-500 text-xs ml-2">{v.name}</span>
                          </div>
                        </Tooltip>
                        <div className="flex justify-center"><RatingBadge rating={mobile[v.key].rating}  value={mobile[v.key].value}  /></div>
                        <div className="flex justify-center"><RatingBadge rating={desktop[v.key].rating} value={desktop[v.key].value} /></div>
                        <span className="text-slate-500 text-xs text-center tabular-nums">{v.threshold}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Indexing & coverage ───────────────────────────────────────────── */}
      <div>
        <Tooltip text={t.indexTip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 cursor-default">{t.indexTitle}</h2>
        </Tooltip>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {indexingCards.map(s => (
            <div key={s.label} className={`bg-navy-800 rounded-xl p-4 border ${s.border}`}>
              <Tooltip text={s.tooltip}>
                <p className="text-slate-500 text-xs mb-1 cursor-default leading-tight">{s.label}</p>
              </Tooltip>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {indexing.errorPages.length > 0 && (
          <div className="mb-4">
            <Tooltip text={t.errorPagesTip}>
              <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2 cursor-default">{t.errorPagesTitle}</p>
            </Tooltip>
            <div className="space-y-2">
              {indexing.errorPages.map((p, i) => (
                <div key={i} className="bg-navy-800 rounded-xl border border-red-500/20 px-5 py-3.5 flex items-start gap-3">
                  <span className="text-red-400 text-sm mt-0.5 shrink-0">✕</span>
                  <div>
                    <p className="text-white text-sm font-medium font-mono break-all">{p.url}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{reasonFor(p.url, p.reason)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {indexing.excludedPages.length > 0 && (
          <div>
            <Tooltip text={t.excludedTip}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 cursor-default">{t.excludedTitle}</p>
            </Tooltip>
            <div className="space-y-2">
              {indexing.excludedPages.map((p, i) => (
                <div key={i} className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-3.5 flex items-start gap-3">
                  <span className="text-slate-500 text-sm mt-0.5 shrink-0">○</span>
                  <div>
                    <p className="text-white text-sm font-medium font-mono break-all">{p.url}</p>
                    <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{reasonFor(p.url, p.reason)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
