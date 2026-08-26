'use client'
import { useState } from 'react'
import type { Rapportdata } from '@/lib/exempelrapport'

/*
 * Rapporten, som kunden ser den.
 *
 * Ordningen är vald efter vad som avgör om de stannar. Bokningarna först —
 * det är det enda som betyder något för en salong, och det ingen byrå kan
 * visa. Sedan arbetsloggen, som är själva skälet till att rapporten finns:
 * en full service-kund säger sällan upp för att resultatet är dåligt, utan
 * för att de inte ser vad de betalar för.
 *
 * Siffrorna kommer sist. De är underlag, inte poäng.
 *
 * Godkännandet gäller bara planen. Det som redan hänt går inte att godkänna,
 * och en knapp som ber om det får hela dokumentet att kännas som en formalitet.
 */

const kr = (n: number) => n.toLocaleString('sv-SE')

export function Rapport({ data, exempel = false }: { data: Rapportdata; exempel?: boolean }) {
  const [godkänd, setGodkänd] = useState(false)

  const d = data
  const perBokning = d.bokning.antal > 0 ? Math.round(d.annons.kostnad / d.bokning.antal) : null
  const skillnad   = d.bokning.antal - d.bokning.föregående

  return (
    <div className="max-w-3xl space-y-5">
      {/* Rubrikkort */}
      <div className="rounded-2xl border border-navy-700 bg-navy-900 p-7">
        <p className="text-mustard text-xs font-semibold uppercase tracking-wider">{d.salong.period}</p>
        <h2 className="text-white text-2xl font-bold mt-1">{d.salong.namn}</h2>
        <p className="text-slate-500 text-sm mt-0.5">{d.salong.ort}</p>

        <p className="text-slate-300 leading-relaxed mt-5">
          {d.bokning.antal} bokningar kom in via sidan, till ett värde av {kr(d.bokning.värde)} kr
          {skillnad !== 0 && ` — ${skillnad > 0 ? 'upp' : 'ned'} ${Math.abs(skillnad)} mot månaden innan`}.
          {' '}Vi la om annonserna mot de behandlingar som faktiskt bokas, svarade på allt som kom in
          på profilen, och la upp månadens bilder. Härnäst flyttar vi budget mot balayage och bygger
          en egen sida för keratinbehandlingen.
        </p>
      </div>

      {/* ── 1. Bokningarna ────────────────────────────────────────────── */}
      <Avsnitt rubrik="Bokningarna" undertext="Det enda som betyder något — resten är underlag.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Tal etikett="Bokningar" värde={String(d.bokning.antal)} under={`föregående ${d.bokning.föregående}`} stark />
          <Tal etikett="Värde" värde={`${kr(d.bokning.värde)} kr`} under="summa priser" />
          <Tal
            etikett="Kostnad per bokning"
            värde={perBokning != null ? `${perBokning} kr` : '—'}
            under="annonskostnad delat med bokningar"
          />
          <Tal etikett="Uteblivna" värde={String(d.bokning.uteblivna)} under={`${d.bokning.genomförda} genomförda`} />
        </div>
      </Avsnitt>

      {/* ── 2. Arbetsloggen ───────────────────────────────────────────── */}
      <Avsnitt rubrik="Det här gjorde vi" undertext="Månadens arbete, punkt för punkt.">
        <ul className="space-y-2.5">
          {d.gjort.map(rad => (
            <li key={rad} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
              <span className="text-mustard shrink-0 text-xs mt-1">✓</span>
              {rad}
            </li>
          ))}
        </ul>
      </Avsnitt>

      {/* ── 3. Google-profilen ────────────────────────────────────────── */}
      <Avsnitt rubrik="Google-profilen">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Tal etikett="Betyg" värde={`${d.profil.betyg} ★`} under={`${d.profil.omdömen} omdömen`} />
          <Tal etikett="Nya omdömen" värde={String(d.profil.nya)} under={`${d.profil.besvarade} besvarade`} />
          <Tal etikett="Visningar" värde={kr(d.profil.visningar)} under="sök och karta" />
          <Tal
            etikett="Kontakter"
            värde={String(d.profil.samtal + d.profil.vägbeskrivningar + d.profil.webbklick)}
            under={`${d.profil.samtal} samtal · ${d.profil.vägbeskrivningar} vägbeskr. · ${d.profil.webbklick} klick`}
          />
        </div>
      </Avsnitt>

      {/* ── 4. Synligheten ────────────────────────────────────────────── */}
      <Avsnitt rubrik="Synligheten" undertext="Det som ligger på plats 4–15 är där nästa vinst finns.">
        <div className="space-y-1">
          {d.sökord.map(s => (
            <div key={s.fras} className="flex items-center gap-4 py-2 border-t border-navy-800 text-sm">
              <span className="flex-1 text-slate-300">{s.fras}</span>
              <span className="text-slate-500 tabular-nums">{kr(s.visningar)} visn.</span>
              <span className="text-white tabular-nums w-12 text-right">{s.position}</span>
              <span
                className={`tabular-nums w-14 text-right ${s.förändring > 0 ? 'text-green-400' : s.förändring < 0 ? 'text-red-400' : 'text-slate-600'}`}
              >
                {s.förändring > 0 ? '↑' : s.förändring < 0 ? '↓' : '–'} {Math.abs(s.förändring).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </Avsnitt>

      {/* ── 5. Annonserna ─────────────────────────────────────────────── */}
      <Avsnitt rubrik="Annonserna">
        <div className="grid grid-cols-3 gap-5 mb-5">
          <Tal etikett="Kostnad" värde={`${kr(d.annons.kostnad)} kr`} under="betalt direkt till Google" />
          <Tal etikett="Klick" värde={kr(d.annons.klick)} under={`${d.annons.cpc} kr per klick`} />
          <Tal
            etikett="Stoppat"
            värde={`${kr(d.annons.stoppat.reduce((s, o) => s + o.kostnad, 0))} kr`}
            under="sökord som inte gav bokningar"
          />
        </div>
        {/* Det stoppade står utskrivet. "Vi sparade 855 kr" är värt mer i
            förtroende än en fin kurva över klick. */}
        <div className="space-y-1">
          {d.annons.stoppat.map(o => (
            <div key={o.fras} className="flex items-center justify-between py-1.5 border-t border-navy-800 text-sm">
              <span className="text-slate-400">{o.fras}</span>
              <span className="text-slate-500 tabular-nums">{o.kostnad} kr, 0 bokningar</span>
            </div>
          ))}
        </div>
      </Avsnitt>

      {/* ── 6. Planen ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-mustard/30 bg-mustard/5 p-7">
        <p className="text-mustard text-xs font-semibold uppercase tracking-wider">Att godkänna</p>
        <h3 className="text-white font-bold text-lg mt-1">Planen för nästa månad</h3>

        <div className="space-y-4 mt-5">
          {d.plan.map((p, i) => (
            <div key={p.rubrik} className="flex gap-3.5">
              <span className="text-mustard font-bold text-sm shrink-0 tabular-nums mt-0.5">{i + 1}.</span>
              <div>
                <p className="text-white font-semibold text-sm">{p.rubrik}</p>
                <p className="text-slate-400 text-sm leading-relaxed mt-1">{p.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-mustard/20">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-white font-semibold text-sm">Annonsbudget</span>
            <span className="text-mustard font-bold">{kr(d.budget.föreslagen)} kr/mån</span>
            {d.budget.föreslagen === d.budget.nu && (
              <span className="text-slate-500 text-xs">oförändrad</span>
            )}
          </div>
          <p className="text-slate-400 text-sm leading-relaxed mt-1.5">{d.budget.motivering}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            onClick={() => setGodkänd(true)}
            disabled={godkänd}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${
              godkänd
                ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                : 'bg-mustard hover:bg-mustard-light text-navy-950'
            }`}
          >
            {godkänd ? '✓ Godkänd' : 'Godkänn planen'}
          </button>
          <span className="text-slate-500 text-xs leading-relaxed">
            Hör vi inget inom sju dagar fortsätter vi enligt planen. En höjd budget genomförs
            aldrig utan att ni sagt ja.
          </span>
        </div>
      </div>

      {exempel && (
        <p className="text-slate-600 text-xs leading-relaxed">
          Siffrorna ovan är exempelsalongens egna — bokningarna räknas ur samma kalender som visas
          under Bokningar. Planen och budgeten är ett påhittat förslag, eftersom den delen bygger på
          annonsdata som ett nytt konto inte har än.
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
      {undertext && <p className="text-slate-500 text-xs mt-1 mb-5">{undertext}</p>}
      <div className={undertext ? '' : 'mt-5'}>{children}</div>
    </div>
  )
}

function Tal({
  etikett, värde, under, stark = false,
}: { etikett: string; värde: string; under: string; stark?: boolean }) {
  return (
    <div>
      <p className="text-slate-500 text-[11px] uppercase tracking-wider">{etikett}</p>
      <p className={`font-bold mt-1 ${stark ? 'text-mustard text-3xl' : 'text-white text-2xl'}`}>{värde}</p>
      <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">{under}</p>
    </div>
  )
}
