import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SiteEditor, type SiteConfig } from './SiteEditor'

const MOCK_CONFIG: SiteConfig = {
  template:       'luxe',
  slug:           'atelier-hair',
  primaryColor:   '#0d0d0d',
  secondaryColor: '#c9a84c',
  brandName:      'Atelier Hair Studio',
  tagline:        'Stockholm · Est. 2012',
  heroHeadline:   'Hair as art. Crafted for you.',
  heroSubtext:    'A boutique hair salon in central Stockholm. Expert colour, precision cuts and treatments designed around your hair.',
  heroCta:        'Book a visit',
  aboutHeadline:  'Our story',
  aboutText:      'Founded in 2012 by master stylist Emma Lindqvist, Atelier has grown into one of Stockholm\'s most trusted boutique salons. We believe great hair starts with listening — every client gets a full consultation before scissors ever meet hair.',
  services: [
    { id: '1', name: 'Haircut & Style',   description: 'Precision cut and professional blow-dry, tailored to your face shape and lifestyle.' },
    { id: '2', name: 'Balayage',          description: 'Freehand colour painted for a sun-kissed, natural finish. No harsh lines.' },
    { id: '3', name: 'Keratin Treatment', description: 'Smooth, frizz-free results that last up to 5 months. Includes a bond-strengthening protocol.' },
    { id: '4', name: 'Scalp Treatment',   description: 'Deep-cleanse and nourish with our bespoke botanical infusion treatment.' },
    { id: '5', name: 'Extensions',        description: 'Premium Scandinavian hair extensions fitted by our certified specialists.' },
    { id: '6', name: 'Toning & Gloss',    description: 'Refresh your colour and add mirror shine. In and out in 45 minutes.' },
  ],
  phone:         '+46 8 123 45 67',
  address:       'Biblioteksgatan 22, 114 35 Stockholm',
  businessHours: 'Tue–Sat 10:00–19:00',
  pages: [
    {
      id:   'tips-och-rad',
      name: 'Tips & Råd',
      slug: 'tips-och-rad',
      articles: [
        {
          id:          'art-1',
          title:       'Hur väljer du rätt hårfärg för din hudton?',
          excerpt:     'Att välja hårfärg kan kännas överväldigande. Vi guidar dig till rätt nyans – oavsett om du är varm, kall eller neutral i undertonen.',
          publishedAt: '2025-10-14',
          blocks: [
            { id: 'a1b1', type: 'h2',        content: 'Förstå din hudton' },
            { id: 'a1b2', type: 'paragraph', content: 'Undertonen i din hud – varm, kall eller neutral – avgör vilka hårfärger som klär dig bäst. Det handlar inte om hur ljus eller mörk du är, utan om nyanserna under hudytan.' },
            { id: 'a1b3', type: 'h3',        content: 'Varma hudtoner' },
            { id: 'a1b4', type: 'paragraph', content: 'Om din hud har gula, guldenbruna eller persikofärgade undertoner passar varma hårfärger utmärkt: honung, karamell, koppar och gyllenbrun lyfter din lyster och ger ett sammanhängande intryck.' },
            { id: 'a1b5', type: 'image',     content: '' },
            { id: 'a1b6', type: 'h3',        content: 'Kalla hudtoner' },
            { id: 'a1b7', type: 'paragraph', content: 'Rosa, röda eller blålila undertoner matchar bäst med ashy-blond, platinaBlond, djupt brun eller mörkrött. Undvik orangetoner – de kan få huden att se gråaktig ut.' },
            { id: 'a1b8', type: 'h3',        content: 'Neutrala hudtoner' },
            { id: 'a1b9', type: 'paragraph', content: 'Grattis – du kan bära det mesta. Både varma och kalla nyanser fungerar, och du kan experimentera friare. Chokladbrun, mörkblond och mjuka balayage är alltid säkra val.' },
          ],
        },
        {
          id:          'art-2',
          title:       '5 tips för friskare hår – särskilt på vintern',
          excerpt:     'Vintern är hård mot håret. Torr inomhusluft och kyla utomhus skadar strukturen. Här är fem enkla åtgärder som gör stor skillnad.',
          publishedAt: '2025-11-28',
          blocks: [
            { id: 'a2b1', type: 'h2',        content: 'Varför lider håret på vintern?' },
            { id: 'a2b2', type: 'paragraph', content: 'Kall luft ute och torr, uppvärmd inomhusluft skapar dramatiska skillnader i luftfuktighet. Håret tappar fukt snabbt, blir mer poröst och lättare att bryta av – speciellt om du ofta bär mössa.' },
            { id: 'a2b3', type: 'h3',        content: '1. Avsluta alltid med kallt vatten' },
            { id: 'a2b4', type: 'paragraph', content: 'Kallt vatten stänger hårets fjällager och ger ett friskare, mer glänsande resultat. Räcker med 30 sekunder i slutet av duschen – men det gör stor skillnad.' },
            { id: 'a2b5', type: 'h3',        content: '2. Använd fuktgivande hårmask en gång i veckan' },
            { id: 'a2b6', type: 'paragraph', content: 'En intensivbehandling gör håret mer smidigt och motståndskraftigt. Lägg på masken, sätt på en badmössa och låt verka i minst 15 minuter. Varm handduk över mössen förstärker effekten.' },
            { id: 'a2b7', type: 'image',     content: '' },
            { id: 'a2b8', type: 'h3',        content: '3. Minska värmebehandlingar' },
            { id: 'a2b9', type: 'paragraph', content: 'Plattång och locktång i kombination med vinterns torra luft är hårets värsta fiende. Använd alltid värmeskydd och sänk temperaturen ett steg – ditt hår klarar sig utan de extra 30 graderna.' },
          ],
        },
        {
          id:          'art-3',
          title:       'Balayage vs. highlights – vad är skillnaden?',
          excerpt:     'Båda teknikerna ger ett ljusare hår, men resultaten är väldigt olika. Vi förklarar vad du bör välja för din hårtyp och livsstil.',
          publishedAt: '2025-12-09',
          blocks: [
            { id: 'a3b1', type: 'h2',        content: 'Två tekniker – två helt olika resultat' },
            { id: 'a3b2', type: 'paragraph', content: 'Highlights och balayage är båda metoder för att ljusa upp håret, men de skiljer sig i teknik, underhåll och slutresultat. Vilken som passar dig bäst beror på din hårtyp, naturliga färg och hur mycket tid du vill lägga på underhåll.' },
            { id: 'a3b3', type: 'h3',        content: 'Highlights' },
            { id: 'a3b4', type: 'paragraph', content: 'Klassiska highlights appliceras med folie och ger ett jämnare, mer strukturerat mönster av ljusare slingor från rot till spets. Perfekt för dig som vill ha tydliga kontraster och ett mer polerat utseende. Inväxning syns efter 6–8 veckor.' },
            { id: 'a3b5', type: 'h3',        content: 'Balayage' },
            { id: 'a3b6', type: 'paragraph', content: 'Balayage målas fritt för hand och koncentreras på mitten och spetsarna – precis som solens naturliga blekning gör. Övergångarna är mjuka och organiska. Inväxningen syns knappt, vilket gör att du kan vänta 12–16 veckor mellan besöken.' },
            { id: 'a3b7', type: 'image',     content: '' },
            { id: 'a3b8', type: 'h3',        content: 'Vår rekommendation' },
            { id: 'a3b9', type: 'paragraph', content: 'Vill du ha lättskötta, naturliga slingor som smälter in med din naturliga bas? Välj balayage. Vill du ha tydlig kontrast och ett jämnare, mer dramatiskt resultat? Välj highlights. Osäker – boka en konsultation, det är gratis hos oss.' },
          ],
        },
        {
          id:          'art-4',
          title:       'Hur ofta bör du klippa håret?',
          excerpt:     'Det finns inget universellt svar – det beror på hårtyp, längd och mål. Vi reder ut det en gång för alla.',
          publishedAt: '2026-01-15',
          blocks: [
            { id: 'a4b1', type: 'h2',        content: 'Varför regelbunden klippning är viktig' },
            { id: 'a4b2', type: 'paragraph', content: 'Regelbundna klippningar tar bort torra, klyftade spetsar och gör att håret ser friskare ut och mår bättre. Det handlar inte om att håret "växer fortare" – det handlar om att bevara längd och kvalitet utan förlust.' },
            { id: 'a4b3', type: 'h3',        content: 'Kort hår' },
            { id: 'a4b4', type: 'paragraph', content: 'Med kort hår är formen allt. Klipp var 4–6 vecka för att bibehålla konturen och undvika att klippningen "växer ut" och tappar sin form.' },
            { id: 'a4b5', type: 'h3',        content: 'Mellanlangt och långt hår' },
            { id: 'a4b6', type: 'paragraph', content: 'Klipp var 8–12 vecka om du vill behålla längden, eller var 6–8 vecka om du märker att spetsarna delar sig snabbt. Tjockt och friskt hår klarar sig längre än tunt eller kemiskt behandlat hår.' },
            { id: 'a4b7', type: 'h3',        content: 'Färgat och kemiskt behandlat hår' },
            { id: 'a4b8', type: 'paragraph', content: 'Kemiska behandlingar ökar hårets porositet och gör det mer sårbart. Klipp gärna var 6–8 vecka och använd återfuktande behandlingar regelbundet för att hålla strukturen intakt.' },
          ],
        },
      ],
    },
  ],
}

export default async function SiteEditorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('user_id', user.id)
    .single()

  if (!company) redirect('/onboarding')

  // TODO: replace MOCK_CONFIG with real fetch once `site_config` + `site_pages` tables are in place
  return <SiteEditor initial={MOCK_CONFIG} companyName={company.name} />
}
