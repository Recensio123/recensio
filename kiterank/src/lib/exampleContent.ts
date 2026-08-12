import type { Article, ArticleBlock } from './articles'

/*
 * What a new site ships with.
 *
 * A salon owner who logs in to an empty site writes nothing — the blank page
 * wins every time. So the site arrives finished: six articles, a team, and a
 * full about page, all in the customer's own voice and all editable. Their job
 * becomes rewriting, which anyone can do, instead of starting from nothing.
 *
 * The photographs are the one thing we cannot write for them. Rather than
 * putting stock pictures of someone else's salon on their site, the examples
 * carry neutral abstract images from /exempel — they hold the layout together
 * and are obviously ours to replace, never a claim about their business.
 */

export const EXAMPLE_IMAGES = [
  '/exempel/arbete-1.svg', '/exempel/arbete-2.svg', '/exempel/arbete-3.svg',
  '/exempel/arbete-4.svg', '/exempel/arbete-5.svg', '/exempel/arbete-6.svg',
]
const PORTRAITS = ['/exempel/medarbetare-1.svg', '/exempel/medarbetare-2.svg', '/exempel/medarbetare-3.svg']

/** True for the images we supplied — the editor flags them as ours to replace. */
export function isExampleImage(src?: string): boolean {
  return !!src?.startsWith('/exempel/')
}

/* ── Reviews ──────────────────────────────────────────────────────────────
   A new site ships with six example reviews so the section shows what it
   looks like full instead of empty. They are ours, and they stay ours: the
   editor labels them, and a published page drops them. Putting words in a
   stranger's mouth on a live business page is not a design shortcut we take,
   and in Sweden presenting invented reviews as real is against the law. */

export type ReviewLike = { source?: string }

/** The reviews a page may actually show. On a published site that means only
 *  the salon's own — from their Google profile or written in by hand. */
export function visibleReviews<T extends ReviewLike>(reviews: T[] | undefined, published: boolean): T[] {
  const all = reviews ?? []
  return published ? all.filter(r => r.source !== 'example') : all
}

/* ── The team ─────────────────────────────────────────────────────────── */

type Member = { name: string; title: string; image: string }

const TEAM_TITLES: Record<string, string[]> = {
  salon:      ['Frisör & grundare', 'Frisör och färgspecialist', 'Frisör'],
  beauty:     ['Hudterapeut & grundare', 'Hudterapeut', 'Nagelterapeut'],
  spa:        ['Spaterapeut & grundare', 'Massör', 'Spaterapeut'],
  fitness:    ['Personlig tränare & grundare', 'Personlig tränare', 'Gruppträningsinstruktör'],
  restaurant: ['Kock & grundare', 'Kock', 'Servis'],
  craftsman:  ['Snickare & grundare', 'Snickare', 'Projektledare'],
  cleaning:   ['Grundare', 'Arbetsledare', 'Lokalvårdare'],
}
const TEAM_DEFAULT = ['Grundare', 'Medarbetare', 'Medarbetare']

export function exampleTeam(industry?: string): Member[] {
  const titles = TEAM_TITLES[industry ?? ''] ?? TEAM_DEFAULT
  return [
    { name: 'Maria Lindqvist', title: titles[0], image: PORTRAITS[0] },
    { name: 'Johan Berg',      title: titles[1], image: PORTRAITS[1] },
    { name: 'Sara Nyström',    title: titles[2], image: PORTRAITS[2] },
  ]
}

/* ── The articles ─────────────────────────────────────────────────────── */

const heading = (text: string): ArticleBlock => ({ type: 'heading', text })
const para    = (text: string): ArticleBlock => ({ type: 'text', text })
const photos  = (srcs: string[], alts: string[]): ArticleBlock =>
  ({ type: 'images', images: srcs.map((src, i) => ({ src, alt: alts[i] ?? '' })) })

/* Written the way a salon would write them: a real question a customer asks,
   answered plainly, with the pictures that make the answer obvious. Six of
   them, because one article looks like an abandoned blog and six looks like a
   business that has something to say. */
type Draft = { title: string; slug: string; excerpt: string; cover: string; coverAlt: string; blocks: ArticleBlock[] }

const SALON_ARTICLES: Draft[] = [
  {
    title:   'Balayage eller slingor — vad passar ditt hår?',
    slug:    'balayage-eller-slingor',
    excerpt: 'Två tekniker som ofta blandas ihop. Här är skillnaden, vad de kostar att underhålla och hur du väljer rätt från början.',
    cover:   EXAMPLE_IMAGES[0],
    coverAlt: 'Hår med mjuka ljusa slingor',
    blocks: [
      para('Det här är den fråga vi får oftast i stolen. Båda ljusar upp håret, men de gör det på helt olika sätt — och skillnaden märks mest ett halvår senare.'),
      heading('Slingor ger jämnhet'),
      para('Slingor läggs i folie från hårbotten och ut. Resultatet blir jämnt och förutsägbart, vilket är precis vad du vill ha om du är ute efter en tydlig ljusning eller ska täcka grått.\n\nBaksidan är att ansatsen blir synlig när håret växer ut. Räkna med att boka om var åttonde till tionde vecka för att hålla resultatet.'),
      heading('Balayage ger mjukhet'),
      para('Balayage målas på fritt hand och börjar en bit ner i håret. Det ger en mjuk övergång som ser ut som sommarsol i håret, och framför allt: den växer ut utan en skarp linje.\n\nDärför fungerar balayage bra om du vill komma in mer sällan. Många av våra kunder klarar sig med två besök om året.'),
      photos([EXAMPLE_IMAGES[1], EXAMPLE_IMAGES[2]], ['Mjuk övergång i längderna', 'Detalj av ljusa partier']),
      heading('Så väljer du'),
      para('Vill du ha en tydlig förändring och kommer gärna in ofta — välj slingor. Vill du ha något som håller länge och växer ut snyggt — välj balayage.\n\nÄr du osäker, boka en konsultation. Den är kostnadsfri och tar tjugo minuter.'),
    ],
  },
  {
    title:   'Så håller färgen längre — fem saker som faktiskt spelar roll',
    slug:    'sa-haller-fargen-langre',
    excerpt: 'Färgen bleknar snabbast de första två veckorna. Det mesta av det som avgör hur länge den håller händer hemma, inte i salongen.',
    cover:   EXAMPLE_IMAGES[3],
    coverAlt: 'Nyfärgat hår i dagsljus',
    blocks: [
      para('Du betalar för en färg som ska hålla i månader. Här är det som faktiskt gör skillnad — och det mesta kostar ingenting.'),
      heading('1. Vänta två dygn med första tvätten'),
      para('Färgen fortsätter att sätta sig efter att du lämnat salongen. Tvättar du håret samma kväll sköljer du bort en del av arbetet.'),
      heading('2. Sänk temperaturen'),
      para('Hett vatten öppnar hårets yttre lager och färgpigmenten följer med ut. Ljummet vatten räcker, och avsluta gärna kallt.'),
      heading('3. Använd schampo utan sulfater'),
      para('Sulfater rengör effektivt — lite för effektivt för färgat hår. Ett milt schampo förlänger färgen märkbart. Vi har alltid några att välja mellan i salongen.'),
      photos([EXAMPLE_IMAGES[4], EXAMPLE_IMAGES[5], EXAMPLE_IMAGES[0]], ['Schampo för färgat hår', 'Behandling i salongen', 'Resultat efter behandling']),
      heading('4. Skydda mot sol och klor'),
      para('En sommarvecka vid poolen tar ut sin rätt på färgen. Ett leave in-skydd före badet gör mer nytta än någon behandling efteråt.'),
      heading('5. Boka en toning mellan färgningarna'),
      para('En toning tar tjugo minuter, kostar en bråkdel av en färgning och friskar upp nyansen. Det är det enklaste sättet att sträcka ut tiden mellan besöken.'),
    ],
  },
  {
    title:   'Vårens färger — det vi ser mest av just nu',
    slug:    'varens-farger',
    excerpt: 'Varma bruna toner, mjuka ljusningar och nyanser som växer ut utan en skarp linje. En titt på vad kunderna frågar efter i år.',
    cover:   EXAMPLE_IMAGES[1],
    coverAlt: 'Varm brun hårfärg',
    blocks: [
      para('Trender i hårfärg rör sig långsammare än i kläder, men de rör sig. Det här är vad vi gör mest av i salongen just nu.'),
      heading('Varmt brunt tar över'),
      para('Efter flera år av kalla, askiga toner går pendeln tillbaka. Varma bruna nyanser med en gnutta kopparglöd klär de flesta och är dessutom skonsammare mot håret, eftersom vi inte behöver ljusa lika mycket.'),
      photos([EXAMPLE_IMAGES[2], EXAMPLE_IMAGES[3]], ['Varm brun nyans', 'Kopparton i solljus']),
      heading('Ljusningar som får växa'),
      para('Det som förenar årets förfrågningar är att ingen vill ha en skarp ansats. Alla tekniker vi använder mest just nu — balayage, babylights, mjuka ljusningar kring ansiktet — är byggda för att växa ut fint.'),
      heading('Vill du prova?'),
      para('Ta med en bild på det du gillar när du kommer. Det säger mer än vilken beskrivning som helst, och vi kan direkt säga vad som är realistiskt utifrån ditt hår.'),
    ],
  },
  {
    title:   'Din första gång hos oss — så går besöket till',
    slug:    'din-forsta-gang',
    excerpt: 'Från konsultationen till sista koll i spegeln. Vad som händer, hur lång tid det tar och vad du behöver ta med dig.',
    cover:   EXAMPLE_IMAGES[4],
    coverAlt: 'Salongens entré',
    blocks: [
      para('Att gå till en ny salong första gången är lite som att lämna över nycklarna till någon du precis träffat. Så här ser det ut hos oss, så vet du vad du kommer till.'),
      heading('Vi börjar med att prata'),
      para('De första tio minuterna handlar inte om hår utan om dig: hur mycket tid du lägger på håret en vanlig morgon, vad som fungerat och vad som inte gjort det. Har du bilder med dig tittar vi på dem tillsammans.'),
      heading('Sedan sätter vi igång'),
      para('Du får veta ungefär hur lång tid behandlingen tar och vad den kostar innan vi börjar. Blir det ändringar under vägen säger vi till först — priset ska aldrig vara en överraskning på slutet.'),
      photos([EXAMPLE_IMAGES[5], EXAMPLE_IMAGES[0]], ['Konsultation vid stolen', 'Behandling pågår']),
      heading('Innan du går'),
      para('Vi går igenom hur du får till samma resultat hemma, och vilka produkter som behövs — och vilka som inte behövs. Vill du boka nästa besök direkt fixar vi det i receptionen.'),
    ],
  },
  {
    title:   'Torrt hår på vintern? Det här hjälper',
    slug:    'torrt-har-pa-vintern',
    excerpt: 'Inomhusvärme, mössor och långa varma duschar. Vintern är hård mot håret — men det mesta går att förebygga.',
    cover:   EXAMPLE_IMAGES[2],
    coverAlt: 'Hår i vinterljus',
    blocks: [
      para('Varje januari kommer samma fråga: varför känns håret som halm så fort kylan sätter in? Svaret är oftast en kombination av tre saker.'),
      heading('Torr luft inomhus'),
      para('Element som går för fullt sänker luftfuktigheten rejält. Håret tappar fukt hela dagen utan att du märker det. En inpackning i veckan väger upp mycket av det.'),
      heading('Friktion från mössan'),
      para('Mössan i sig är inte problemet — materialet är det. Ull och grova stickningar sliter på hårytan. Ett foder i siden eller satin gör stor skillnad, och finns att köpa löst att sy in.'),
      photos([EXAMPLE_IMAGES[3], EXAMPLE_IMAGES[4], EXAMPLE_IMAGES[1]], ['Inpackning i salongen', 'Vinterrutin hemma', 'Resultat efter behandling']),
      heading('Det du kan göra i salongen'),
      para('En återfuktande behandling tar tjugo minuter i samband med klippningen och håller i flera veckor. Under vinterhalvåret rekommenderar vi den till de flesta — särskilt om håret är färgat.'),
    ],
  },
  {
    title:   'Presentkort — en tid att se fram emot',
    slug:    'presentkort',
    excerpt: 'Ett presentkort som gäller på allt vi gör, utan sista förbrukningsdag att hålla reda på.',
    cover:   EXAMPLE_IMAGES[5],
    coverAlt: 'Presentkort från salongen',
    blocks: [
      para('Ibland är den bästa presenten en timme där någon annan tar hand om allt. Våra presentkort gäller på hela vårt utbud — klippning, färg och behandlingar.'),
      heading('Så fungerar det'),
      para('Du väljer själv belopp eller en specifik behandling. Kortet gäller i ett år och kan användas vid flera tillfällen om beloppet räcker till mer än ett besök.'),
      photos([EXAMPLE_IMAGES[0], EXAMPLE_IMAGES[2]], ['Presentkort', 'Inslagning i salongen']),
      heading('Var får jag tag på det?'),
      para('Kom förbi salongen så skriver vi ut ett direkt, eller ring oss så löser vi det över telefon och skickar det digitalt samma dag.'),
    ],
  },
]

/* Trades other than salons get the same structure with their own subjects —
   the point of the examples is the shape of a good article, not the topic. */
const GENERIC_TITLES: Record<string, string[]> = {
  beauty:     ['Så förbereder du huden inför behandlingen', 'Fem vanor som gör mest skillnad för huden', 'Vårens behandlingar', 'Ditt första besök hos oss', 'Torr hud på vintern? Det här hjälper', 'Presentkort'],
  spa:        ['Så får du ut mest av ditt spabesök', 'Fem sätt att ta med lugnet hem', 'Vårens behandlingar', 'Ditt första besök hos oss', 'Återhämtning under vintern', 'Presentkort'],
  fitness:    ['Så kommer du igång igen efter ett uppehåll', 'Fem misstag nybörjare gör på gymmet', 'Vårens träningsupplägg', 'Ditt första pass hos oss', 'Träna genom vintern', 'Presentkort'],
  restaurant: ['Så tänker vi kring säsongens råvaror', 'Fem rätter våra gäster beställer om och om igen', 'Vårens meny', 'Ditt första besök hos oss', 'Vintermenyn', 'Presentkort'],
  craftsman:  ['Så går ett jobb till från offert till klart', 'Fem saker att tänka på innan renoveringen', 'Vårens projekt', 'Så förbereder du inför vårt besök', 'Att renovera på vintern', 'Presentkort'],
  cleaning:   ['Så går en städning till hos oss', 'Fem saker som gör störst skillnad hemma', 'Vårstädning', 'Ditt första besök av oss', 'Vinterns fläckar och hur du får bort dem', 'Presentkort'],
}

/** Fill in what the customer has not supplied yet. Anything they have saved —
 *  even an empty list they emptied on purpose — is left exactly as it is. */
export function withExamples<T extends { team?: { name: string; title: string; image: string }[]; articles?: Article[] }>(
  content: T,
  industry?: string,
): T {
  return {
    ...content,
    team:     content.team     ?? exampleTeam(industry),
    articles: content.articles ?? exampleArticles(industry),
  }
}

export function exampleArticles(industry?: string, date = '2026-01-15'): Article[] {
  const swap = GENERIC_TITLES[industry ?? '']
  /* One a month backwards, so the list reads as a site that has been kept up
     rather than six pieces published the same afternoon. */
  const dated = (i: number) => {
    const d = new Date(date)
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 10)
  }
  return SALON_ARTICLES.map((a, i) => ({
    id:        `exempel-${i + 1}`,
    title:     swap?.[i] ?? a.title,
    slug:      a.slug,
    excerpt:   a.excerpt,
    cover:     a.cover,
    coverAlt:  a.coverAlt,
    blocks:    a.blocks,
    published: true,
    date:      dated(i),
  }))
}
