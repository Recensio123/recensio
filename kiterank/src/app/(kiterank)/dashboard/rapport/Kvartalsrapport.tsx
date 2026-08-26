import type { Kvartalsdata, Jamforelse } from '@/lib/exempelkvartal'
import { forandring } from '@/lib/exempelkvartal'

/*
 * Kvartalsrapporten, som kunden ser den.
 *
 * Månadsrapporten svarar på vad som hände. Den här svarar på åt vilket håll
 * det går, och det är en annan sorts dokument: varje tal står bredvid vad det
 * var förra kvartalet, och där det finns historik även bredvid samma kvartal i
 * fjol.
 *
 * Årsjämförelsen är inte prydnad. Utan den läses varje säsongsvariation som en
 * förbättring eller en försämring — en salong går inte sämre i juli, den har
 * semester, och en rapport som inte säger det får någon att fatta ett beslut
 * på fel grund.
 *
 * Ordningen är vald efter vad som avgör om de stannar som kund: pengarna
 * först, kundstocken näst — det är den som förklarar pengarna — och sedan
 * synligheten som förklarar kundstocken. Förslagen sist.
 */

const kr = (n: number) => n.toLocaleString('sv-SE')

export function Kvartalsrapport({ data, exempel = false }: { data: Kvartalsdata; exempel?: boolean }) {
  const d = data

  return (
    <div className="max-w-3xl space-y-5">
      {/* Rubrikkort */}
      <div className="rounded-2xl border border-navy-700 bg-navy-900 p-7">
        <p className="text-mustard text-xs font-semibold uppercase tracking-wider">
          Kvartalsrapport · {d.period.nu}
        </p>
        <h2 className="text-white text-2xl font-bold mt-1">{d.salong.namn}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{d.salong.ort}</p>
        <p className="text-slate-300 leading-relaxed mt-5">
          Tre månader är den kortaste period där en förändring betyder något. Allt nedan står
          bredvid {d.period.fore}, och där vi har historik även bredvid {d.period.ifjol} — så att
          en säsong inte förväxlas med en trend.
        </p>
      </div>

      {/* ── 1. Pengarna ───────────────────────────────────────────────── */}
      <Avsnitt rubrik="Kvartalet mot förra" undertext={`${d.period.nu} jämfört med ${d.period.fore}`}>
        <div className="grid sm:grid-cols-3 gap-5">
          <Jamfor etikett="Bokningar" v={d.bokningar} period={d.period} stark />
          <Jamfor etikett="Värde" v={d.varde} period={d.period} enhet=" kr" />
          <Jamfor etikett="Snitt per bokning" v={d.snitt} period={d.period} enhet=" kr" />
        </div>
      </Avsnitt>

      {/* ── 2. Kundstocken ────────────────────────────────────────────── */}
      <Avsnitt
        rubrik="Kundstocken"
        undertext="Den siffra ingen tittar på och som förklarar mest — en salong kan skaffa nya kunder i jämn takt och ändå krympa."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Tal etikett="Nya kunder" värde={String(d.kunder.nya)} under="första besöket hos er" />
          <Tal etikett="Återkom" värde={String(d.kunder.aterkommande)} under="hade varit här förut" />
          <Tal
            etikett="Slutade komma"
            värde={String(d.kunder.tappade)}
            under={`bokade ${d.period.fore}, inte nu`}
            varning={d.kunder.tappade > d.kunder.nya}
          />
          <Tal etikett="Andel återkommande" värde={`${d.kunder.andelAter} %`} under="av kvartalets bokningar" />
        </div>
        {d.kunder.tappade > 0 && (
          <p className="text-slate-400 text-sm leading-relaxed mt-5 pt-4 border-t border-navy-800">
            De {d.kunder.tappade} som slutade komma är den billigaste tillväxten ni har. De känner
            er redan, de vet var ni ligger, och de flesta slutade utan någon särskild anledning.
          </p>
        )}
      </Avsnitt>

      {/* ── 3. Varifrån bokningarna kom ───────────────────────────────── */}
      <Avsnitt rubrik="Varifrån bokningarna kom" undertext={`Förändringen är mot ${d.period.fore}.`}>
        <div className="space-y-1">
          {d.kanaler.map(k => (
            <div key={k.namn} className="flex items-center gap-4 py-2 border-t border-navy-800 text-sm">
              <span className="flex-1 text-slate-300">{k.namn}</span>
              <span className="text-white tabular-nums">{k.antal} st</span>
              <Delta värde={k.forandring} />
            </div>
          ))}
        </div>
      </Avsnitt>

      {/* ── 4. Behandlingarna ─────────────────────────────────────────── */}
      <Avsnitt rubrik="Behandlingarna som drar in mest" undertext="Fem största efter värde, med förändring i antal.">
        <div className="space-y-1">
          {d.tjanster.map(t => (
            <div key={t.namn} className="flex items-center gap-4 py-2 border-t border-navy-800 text-sm">
              <span className="flex-1 text-slate-300">{t.namn}</span>
              <span className="text-slate-500 tabular-nums">{t.antal} st</span>
              <span className="text-white tabular-nums w-24 text-right">{kr(t.varde)} kr</span>
              <Delta värde={t.forandring} />
            </div>
          ))}
        </div>
      </Avsnitt>

      {/* ── 5. Svagaste tiderna ───────────────────────────────────────── */}
      <Avsnitt
        rubrik="Där kalendern är tunnast"
        undertext="Underlag för nästa kvartal — det är här ett erbjudande eller en annons gör mest nytta."
      >
        <div className="flex flex-wrap gap-3">
          {d.svagast.map(s => (
            <div key={s.dag} className="rounded-xl border border-navy-700 bg-navy-950 px-5 py-3">
              <p className="text-white font-semibold text-sm">{s.dag}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.antal} bokningar i kvartalet</p>
            </div>
          ))}
        </div>
      </Avsnitt>

      {/* ── 6. Synligheten ────────────────────────────────────────────── */}
      <Avsnitt rubrik="Synligheten" undertext="Betyg, omdömen och var ni ligger i sökningen.">
        <div className="grid sm:grid-cols-2 gap-5 mb-6">
          <Jamfor etikett="Betyg" v={d.synlighet.betyg} period={d.period} enhet=" ★" />
          <Jamfor etikett="Antal omdömen" v={d.synlighet.omdomen} period={d.period} />
        </div>

        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Sökord — snittposition</p>
        <div className="space-y-1 mb-6">
          {d.synlighet.sokord.map(s => {
            /* Lägre position är bättre, så riktningen vänds. */
            const bättre = s.nu < s.fore
            return (
              <div key={s.fras} className="flex items-center gap-4 py-2 border-t border-navy-800 text-sm">
                <span className="flex-1 text-slate-300">{s.fras}</span>
                <span className="text-slate-500 tabular-nums">{s.fore.toFixed(1)}</span>
                <span className="text-slate-600">→</span>
                <span className="text-white tabular-nums w-10 text-right">{s.nu.toFixed(1)}</span>
                <span className={`w-16 text-right tabular-nums ${bättre ? 'text-green-400' : 'text-red-400'}`}>
                  {bättre ? '↑' : '↓'} {Math.abs(s.nu - s.fore).toFixed(1)}
                </span>
              </div>
            )
          })}
        </div>

        <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">De tre närmaste</p>
        <div className="space-y-1">
          {d.synlighet.konkurrenter.map(k => (
            <div key={k.namn} className="flex items-center gap-4 py-2 border-t border-navy-800 text-sm">
              <span className="flex-1 text-slate-300">{k.namn}</span>
              <span className="text-slate-500 tabular-nums">{k.betyg} ★</span>
              <span className="text-slate-500 tabular-nums w-20 text-right">{k.omdomen} omd.</span>
              <span className="text-slate-500 tabular-nums w-20 text-right">plats {k.kartplats}</span>
            </div>
          ))}
          <div className="flex items-center gap-4 py-2 border-t border-mustard/30 text-sm">
            <span className="flex-1 text-mustard font-semibold">{d.salong.namn}</span>
            <span className="text-mustard tabular-nums">{d.synlighet.betyg.nu} ★</span>
            <span className="text-mustard tabular-nums w-20 text-right">{d.synlighet.omdomen.nu} omd.</span>
            <span className="text-mustard tabular-nums w-20 text-right">plats 3</span>
          </div>
        </div>
      </Avsnitt>

      {/* ── 7. Nästa kvartal ──────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-mustard/30 bg-mustard/5 p-7">
        <p className="text-mustard text-xs font-semibold uppercase tracking-wider">Nästa kvartal</p>
        <h3 className="text-white font-bold text-lg mt-1">Tre saker vi föreslår</h3>
        <div className="space-y-4 mt-5">
          {d.nastaKvartal.map((p, i) => (
            <div key={p.rubrik} className="flex gap-3.5">
              <span className="text-mustard font-bold text-sm shrink-0 tabular-nums mt-0.5">{i + 1}.</span>
              <div>
                <p className="text-white font-semibold text-sm">{p.rubrik}</p>
                <p className="text-slate-400 text-sm leading-relaxed mt-1">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {exempel && (
        <p className="text-slate-600 text-xs leading-relaxed">
          Bokningar, värde, kundstock, kanaler, behandlingar och svaga dagar är räknade ur
          exempelsalongens egen kalender — samma bokningar som visas under Bokningar. Betyg,
          sökord och konkurrentläge kommer i skarp drift ur Google-profilen och Search Console;
          här är de exempel, eftersom ett nytt konto saknar historik att jämföra mot.
        </p>
      )}
    </div>
  )
}

/* ─── Byggstenar ───────────────────────────────────────────────────────── */

function Avsnitt({
  rubrik, undertext, children,
}: { rubrik: string; undertext?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900 p-7">
      <h3 className="text-white font-bold">{rubrik}</h3>
      {undertext && <p className="text-slate-500 text-xs mt-1 mb-5 leading-relaxed">{undertext}</p>}
      <div className={undertext ? '' : 'mt-5'}>{children}</div>
    </div>
  )
}

/** Ett tal med sin jämförelse bakåt — det är hela poängen med kvartalet. */
function Jamfor({
  etikett, v, period, enhet = '', stark = false,
}: {
  etikett: string; v: Jamforelse; period: { fore: string; ifjol: string }
  enhet?: string; stark?: boolean
}) {
  const mot = forandring(v.nu, v.fore)
  const motFjol = v.ifjol != null ? forandring(v.nu, v.ifjol) : null

  return (
    <div>
      <p className="text-slate-500 text-[11px] uppercase tracking-wider">{etikett}</p>
      <p className={`font-bold mt-1 ${stark ? 'text-mustard text-3xl' : 'text-white text-2xl'}`}>
        {v.nu.toLocaleString('sv-SE')}{enhet}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <Delta värde={mot} />
        <span className="text-slate-600 text-[11px]">mot {period.fore}</span>
      </div>
      {motFjol != null && (
        <div className="flex items-center gap-2 mt-1">
          <Delta värde={motFjol} />
          <span className="text-slate-600 text-[11px]">mot {period.ifjol}</span>
        </div>
      )}
    </div>
  )
}

function Delta({ värde }: { värde: number | null }) {
  if (värde == null) return <span className="text-slate-600 text-xs tabular-nums">—</span>
  const upp = värde > 0
  return (
    <span className={`text-xs tabular-nums font-medium ${upp ? 'text-green-400' : värde < 0 ? 'text-red-400' : 'text-slate-500'}`}>
      {upp ? '+' : ''}{värde} %
    </span>
  )
}

function Tal({
  etikett, värde, under, varning = false,
}: { etikett: string; värde: string; under: string; varning?: boolean }) {
  return (
    <div>
      <p className="text-slate-500 text-[11px] uppercase tracking-wider">{etikett}</p>
      <p className={`text-2xl font-bold mt-1 ${varning ? 'text-red-400' : 'text-white'}`}>{värde}</p>
      <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">{under}</p>
    </div>
  )
}
