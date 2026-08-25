import Link from 'next/link'

/*
 * En rad överst: hemsidan är inte klar än.
 *
 * Inte en checklista. Kunden som öppnar startsidan är inte där för att bocka av
 * sex punkter — de är där för att se hur det går. Att det som ska göras ligger
 * i panelen räcker; det här är påminnelsen om att gå dit.
 *
 * Antalet står med eftersom "inte färdig" utan mängd låter som ett stort jobb.
 * "Två steg kvar" är något man gör ikväll.
 */
export function SajtNotis({ kvar }: { kvar: number }) {
  if (kvar < 1) return null

  return (
    <div className="flex items-center gap-3 flex-wrap bg-mustard/10 border border-mustard/30 rounded-xl px-4 py-3">
      <span className="text-mustard text-sm shrink-0">OBS</span>
      <p className="text-slate-200 text-sm flex-1 min-w-0">
        Din hemsida är inte färdig ännu —{' '}
        <span className="text-white font-semibold">
          {kvar === 1 ? 'ett steg kvar' : `${kvar} steg kvar`}
        </span>
        .
      </p>
      <Link
        href="/dashboard/webbplats"
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-mustard text-navy-950 hover:bg-mustard/90 transition-colors"
      >
        Gör klart hemsidan →
      </Link>
    </div>
  )
}
