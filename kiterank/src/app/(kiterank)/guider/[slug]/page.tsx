import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/marketing/Nav'
import { MarknadsFot } from '@/components/marketing/MarknadsFot'
import { GUIDER, hittaGuide, KALLOR, type Stycke } from '@/lib/guider'
import { Lasindikator } from '../Lasindikator'

/*
 * En guide.
 *
 * Byggs vid deploy och inte per besök — innehållet ändras när någon skriver om
 * det, inte när någon läser det. Det gör sidan snabb, vilket Google mäter, och
 * billig, vilket vi märker den dagen en guide börjar gå.
 */
export function generateStaticParams() {
  return GUIDER.map(g => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = hittaGuide(slug)
  if (!g) return {}
  return {
    title:       `${g.metaTitel} | Kiterank`,
    description: g.metaText,
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = hittaGuide(slug)
  if (!guide) notFound()

  /* De andra guiderna, till den som läst klart. En artikel utan väg vidare är
     ett besök som slutar i webbläsarens bakåtknapp. */
  const övriga = GUIDER.filter(g => g.slug !== guide.slug).slice(0, 2)

  /* Rubrikerna, som ankare och som innehållsförteckning. Räknas här en gång
     i stället för i två komponenter som riskerar att räkna olika. */
  const rubriker = guide.innehall
    .filter((s): s is { sort: 'rubrik'; text: string } => s.sort === 'rubrik')
    .map(s => ({ text: s.text, id: rubrikId(s.text) }))

  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Lasindikator farg={guide.farg} />
      <Nav />

      <article className="max-w-2xl mx-auto px-6 pt-16 pb-20">
        <Link href="/guider" className="text-white/35 hover:text-white text-sm transition-colors">
          ← Alla guider
        </Link>

        <div className="flex items-center gap-3 text-xs mt-8 mb-4">
          <span className="bg-[#f0b429]/12 text-[#f0b429] px-2.5 py-1 rounded-full font-medium">{guide.amne}</span>
          <span className="text-white/25">{guide.minuter} min läsning</span>
          <span className="text-white/25">·</span>
          <time className="text-white/25" dateTime={guide.publicerad}>
            {new Date(guide.publicerad).toLocaleDateString('sv-SE')}
          </time>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold leading-tight">{guide.titel}</h1>
        <p className="text-white/50 text-lg leading-relaxed mt-4">{guide.ingress}</p>

        {guide.bild && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={guide.bild}
            alt=""
            className="w-full aspect-[3/1] object-cover rounded-2xl mt-8"
            loading="eager"
          />
        )}

        {/* Innehållsförteckning på de långa. Tretton minuter utan överblick
            känns längre än det är, och den som söker ett visst avsnitt ska
            slippa scrolla förbi allt annat för att hitta det. */}
        {rubriker.length >= 5 && (
          <nav className="mt-8 rounded-2xl border border-white/10 bg-white/3 p-6">
            <p className="text-[11px] uppercase tracking-wider text-white/30 mb-3">I den här guiden</p>
            <ol className="space-y-1.5">
              {rubriker.map((r, i) => (
                <li key={r.id}>
                  <a
                    href={`#${r.id}`}
                    className="text-sm text-white/55 hover:text-white transition-colors flex gap-3"
                  >
                    <span className="text-white/20 tabular-nums shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    {r.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-10">
          {guide.innehall.map((s, i) => {
            /* Listan direkt efter 'Vad ni gör den här veckan' ritas som en
               checklista. Den hittas på rubriken före och inte på ett fält i
               datan — en flagga hade behövt sättas rätt i sexton guider. */
            const fore = guide.innehall[i - 1]
            const attGora = s.sort === 'lista' && fore?.sort === 'rubrik' && /^Vad ni gör/.test(fore.text)
            return (
              <StyckeBlock
                key={i}
                s={s}
                id={s.sort === 'rubrik' ? rubrikId(s.text) : undefined}
                checklista={attGora}
              />
            )
          })}
        </div>

        {/* Erbjudandet sist, och bara en gång. Den som läst en hel guide om
            hur man gör det själv har förtjänat att slippa bli avbruten mitt i
            av en ruta som säger att vi gör det åt dem. */}
        <div className="mt-14 rounded-2xl border border-[#f0b429]/25 bg-[#f0b429]/5 p-7">
          <p className="font-bold">Vill du slippa göra det för hand?</p>
          <p className="text-white/50 text-sm leading-relaxed mt-2">
            Kiterank sköter det mesta av det här åt dig — och säger till när något behöver din
            hand. Hemsida, bokning och marknadsföring i ett konto.
          </p>
          <div className="flex flex-wrap gap-4 items-center mt-5">
            <Link
              href="/priser"
              className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Se vad det kostar →
            </Link>
            <Link href="/features" className="text-white/50 hover:text-white text-sm transition-colors">
              Eller läs vad som ingår
            </Link>
          </div>
        </div>

        {/* Källorna, sist och lågmält. De ska gå att kontrollera av den som
            vill, utan att avbryta den som bara ville ha rådet. */}
        <div className="mt-10 pt-6 border-t border-white/8">
          <p className="text-[11px] uppercase tracking-wider text-white/25 mb-3">Guiden bygger på</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {KALLOR.map(k => (
              <span key={k.namn} className="text-xs text-white/35">
                <span className="text-white/60">{k.namn}</span> — {k.om}
              </span>
            ))}
          </div>
        </div>

        {övriga.length > 0 && (
          <div className="mt-14 pt-10 border-t border-white/8">
            <p className="text-[11px] uppercase tracking-wider text-white/25 mb-4">Läs också</p>
            <div className="space-y-3">
              {övriga.map(g => (
                <Link
                  key={g.slug}
                  href={`/guider/${g.slug}`}
                  className="block rounded-xl border border-white/10 bg-white/3 p-5 hover:bg-white/6 transition-colors group"
                >
                  <p className="font-semibold group-hover:text-[#f0b429] transition-colors">{g.titel}</p>
                  <p className="text-white/40 text-sm mt-1 leading-relaxed">{g.ingress}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <MarknadsFot />
    </div>
  )
}

/* ─── Styckena ─────────────────────────────────────────────────────────── */

/** Rubriken som ett ankare i adressfältet. Siffror och skiljetecken bort. */
function rubrikId(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\d+\.\s*/, '')
    .replace(/[åä]/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/** Sista listan i en guide är alltid att göra-listan. Den ska inte se ut som
 *  de andra — det är artikelns behållning, och den som bara läser en sak ska
 *  läsa den. */
function StyckeBlock({ s, id, checklista = false }: { s: Stycke; id?: string; checklista?: boolean }) {
  if (s.sort === 'rubrik') {
    return (
      <h2 id={id} className="text-xl font-bold mt-10 mb-3 leading-snug scroll-mt-24">
        {s.text}
      </h2>
    )
  }

  if (s.sort === 'lista') {
    if (checklista) {
      return (
        <div className="my-5 rounded-2xl border border-[#f0b429]/25 bg-[#f0b429]/5 p-6">
          <ul className="space-y-3">
            {s.poster.map(p => (
              <li key={p} className="flex gap-3.5 text-white/70 leading-relaxed">
                <span className="w-5 h-5 rounded border border-[#f0b429]/50 shrink-0 mt-0.5" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return (
      <ul className="space-y-2.5 my-5">
        {s.poster.map(p => (
          <li key={p} className="flex gap-3 text-white/55 leading-relaxed">
            <span className="text-[#f0b429] shrink-0 mt-1 text-xs">✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (s.sort === 'ruta') {
    return (
      <div className="my-6 rounded-xl border-l-2 border-[#f0b429] bg-white/4 px-5 py-4">
        <p className="font-semibold text-sm">{s.rubrik}</p>
        <p className="text-white/50 text-sm leading-relaxed mt-1.5">{s.text}</p>
      </div>
    )
  }

  /*
   * Länken vidare, som avslutar ett avsnitt.
   *
   * Var först en fylld ruta i full bredd. I pelaren står fem av dem, och då
   * läser sidan som fem knappar med text emellan i stället för som en text
   * med vägar ut. En länk ska se ut som en länk: bredden följer orden, ingen
   * bakgrund, och pilen flyttar sig en aning när man pekar.
   */
  if (s.sort === 'vidare') {
    return (
      <div className="my-5">
        <Link
          href={`/guider/${s.till}`}
          className="group inline-flex items-center gap-2 text-sm font-medium text-[#f0b429] hover:text-[#e0a520] transition-colors"
        >
          {s.text}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    )
  }

  return <p className="text-white/55 leading-relaxed my-4">{s.text}</p>
}
