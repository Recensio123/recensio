import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'
import { MarknadsFot } from '@/components/marketing/MarknadsFot'
import { guiderAv, type Guide } from '@/lib/guider'

/*
 * Guidebiblioteket.
 *
 * Ordningen är vald efter hur en läsare rör sig, inte efter hur innehållet är
 * kategoriserat: den breda guiden först, sex fördjupningar, sedan frågan om
 * vilken bransch man driver, och resten av fördjupningarna under den.
 *
 * Branschraden mitt i listan är med flit. Den som skummat sex kort utan att
 * hitta sitt ämne får där en annan sorts fråga att svara på — och det bryter
 * dessutom av mot rutnätet, som annars läses som en enda grå yta hur bra
 * texterna än är.
 *
 * Ämnesguiderna är numrerade eftersom de har en verklig ordning: profilen
 * före omdömena, omdömena före sidan, sidan före annonserna. Nästan ingen
 * blogg har en ordning, och därför numrerar nästan ingen — men här hjälper
 * det, för den som följer den i tur och ordning gör rätt saker i rätt följd.
 */

export const metadata = {
  title:       'Guider för salonger | Kiterank',
  description: 'Konkreta guider om Google, omdömen, lokal SEO, hemsidor, priser och annonser — skrivna för salonger och lokala tjänsteföretag, utan jargong och utan säljsnack.',
}

/** Hur många ämnesguider som står ovanför branschraden. */
const FORE_BRANSCH = 6

export default function GuiderPage() {
  const pelare    = guiderAv('pelare')[0]
  const amnen     = guiderAv('amne')
  const branscher = guiderAv('bransch')

  const forsta = amnen.slice(0, FORE_BRANSCH)
  const resten = amnen.slice(FORE_BRANSCH)

  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Nav />

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center space-y-4">
        <h1 className="text-4xl font-bold leading-tight">Guider för salonger</h1>
        <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
          Det vi kan om att få fler kunder till en lokal salong, utskrivet. Ingen kräver att du
          köper något för att följa råden.
        </p>
      </section>

      {/* ── Pelaren, i full bredd ──────────────────────────────────────── */}
      {pelare && <Hero guide={pelare} />}

      {/* ── De sex första ämnesguiderna ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-14">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-5">
          Gå djupare, i tur och ordning
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {forsta.map((g, i) => <Kort key={g.slug} guide={g} nummer={i + 1} />)}
        </div>
      </section>

      {/* ── Branschraden ───────────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-white/2">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">Kort guide för din bransch</h2>
            <p className="text-white/40 text-sm mt-1.5">
              Det som bara gäller er — sökorden era kunder skriver, säsongen ni lever med.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {branscher.map(g => (
              <Link
                key={g.slug}
                href={`/guider/${g.slug}`}
                className="group rounded-xl border border-white/10 bg-[#080f1e] px-4 py-4 text-center hover:border-[#f0b429]/50 hover:bg-white/4 transition-colors"
              >
                <p className="text-sm font-semibold leading-snug group-hover:text-[#f0b429] transition-colors">
                  {g.amne}
                </p>
                <p className="text-white/25 text-[11px] mt-1.5">{g.minuter} min →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Resten av ämnesguiderna ────────────────────────────────────── */}
      {resten.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-14">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-5">
            Mer att läsa
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {resten.map((g, i) => <Kort key={g.slug} guide={g} nummer={FORE_BRANSCH + i + 1} />)}
          </div>
        </section>
      )}

      <MarknadsFot />
    </div>
  )
}

/* ─── Pelaren ──────────────────────────────────────────────────────────── */

function Hero({ guide }: { guide: Guide }) {
  /* Avsnittsrubrikerna ur guiden, som innehållsförteckning. Läsaren ser då
     vad guiden faktiskt täcker i stället för att behöva lita på ingressen. */
  const avsnitt = guide.innehall
    .filter((s): s is { sort: 'rubrik'; text: string } => s.sort === 'rubrik')
    .map(s => s.text)
    .filter(t => /^\d\./.test(t))

  return (
    <section className="max-w-5xl mx-auto px-6 pb-14">
      <Link
        href={`/guider/${guide.slug}`}
        className="group block rounded-2xl border-2 border-[#f0b429]/30 bg-[#f0b429]/5 overflow-hidden hover:border-[#f0b429]/60 transition-colors"
      >
        <div className="grid md:grid-cols-[1.35fr_1fr]">
          <div className="p-8 md:p-10">
            <p className="text-[#f0b429] text-xs font-semibold uppercase tracking-wider">Börja här</p>
            <h2 className="text-3xl font-bold mt-2 leading-tight group-hover:text-[#f0b429] transition-colors">
              {guide.titel}
            </h2>
            <p className="text-white/50 leading-relaxed mt-3">{guide.ingress}</p>

            {avsnitt.length > 0 && (
              <div className="mt-6 pt-5 border-t border-[#f0b429]/15">
                <p className="text-[11px] uppercase tracking-wider text-white/30 mb-2.5">Guiden täcker</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {avsnitt.map(a => (
                    <span key={a} className="text-sm text-white/55">{a.replace(/^\d\.\s*/, '')}</span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-white/35 text-sm mt-6">{guide.minuter} min läsning · läs guiden →</p>
          </div>

          {guide.bild && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={guide.bild}
              alt=""
              className="w-full h-full object-cover min-h-[180px]"
              loading="eager"
            />
          )}
        </div>
      </Link>
    </section>
  )
}

/* ─── Ett ämneskort ────────────────────────────────────────────────────── */

function Kort({ guide, nummer }: { guide: Guide; nummer: number }) {
  const farg = guide.farg ?? '#f0b429'
  return (
    <Link
      href={`/guider/${guide.slug}`}
      className="group rounded-2xl border border-white/10 bg-white/3 overflow-hidden flex flex-col hover:bg-white/6 transition-colors"
      style={{ borderTopColor: farg, borderTopWidth: 2 }}
    >
      {guide.bild && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={guide.bild} alt="" loading="lazy" className="w-full aspect-[3/2] object-cover" />
      )}
      <div className="p-6 flex flex-col gap-2.5 flex-1">
        <div className="flex items-center gap-2.5">
          {/* Numret är ordningen guiderna är värda att läsas i, inte en
              godtycklig sortering. */}
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: `${farg}22`, color: farg }}
          >
            {nummer}
          </span>
          <span className="text-[11px] uppercase tracking-wider" style={{ color: farg }}>{guide.amne}</span>
          <span className="text-white/20 text-[11px] ml-auto">{guide.minuter} min</span>
        </div>
        <h3 className="font-bold leading-snug group-hover:text-white transition-colors">{guide.titel}</h3>
        <p className="text-white/40 text-sm leading-relaxed flex-1">{guide.ingress}</p>
        <span className="text-white/30 text-sm group-hover:text-white transition-colors">Läs guiden →</span>
      </div>
    </Link>
  )
}
