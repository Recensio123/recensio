/*
 * Vad som står på skärmen medan bokningarna hämtas.
 *
 * Utan den här filen händer ingenting alls när man klickar på Bokningar: Next
 * håller kvar föregående sida tills servern renderat färdigt, så ett klick som
 * tar en sekund ser ut som ett klick som inte tog. Filen lägger sidan i en
 * Suspense-gräns under panelens layout, och då byts innehållet ut direkt.
 *
 * Formen är sidans egen — rubrik, knappar, flikrad, kalender — och inte en
 * snurra mitt på skärmen. Skelettet står kvar i millisekunder, och under den
 * tiden är det värt mer att ögat redan hittat dit flikarna kommer hamna än att
 * det tittat på något som roterar.
 */

/** En yta som ska bli innehåll. Pulsen är hela signalen om att något är på väg. */
function Platta({ className }: { className: string }) {
  return <div className={`bg-navy-800 rounded animate-pulse ${className}`} />
}

export default function Loading() {
  return (
    <div className="p-4 sm:p-8 max-w-6xl" aria-busy="true" aria-label="Laddar bokningar">
      {/* Rubrik och knappar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <Platta className="h-7 w-40" />
          <Platta className="h-4 w-64 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Platta className="h-9 w-28 rounded-lg" />
          <Platta className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* Flikraden, i sin egen ram så att den ligger still när flikarna dyker upp */}
      <div className="flex flex-wrap gap-1 bg-navy-900 border border-navy-700 rounded-lg p-1 mb-6 w-fit">
        {/* Bredderna följer flikarnas namn — Kalender, Bokningshistorik,
            Personal, Kommande, Meddelanden — så att raden inte hoppar i sidled
            när de riktiga orden kommer. Nyckeln är platsen och inte bredden:
            Kalender och Personal är lika breda, och två syskon med samma nyckel
            får React inte isär. */}
        {['w-20', 'w-32', 'w-20', 'w-24', 'w-28'].map((w, i) => (
          <Platta key={i} className={`h-7 ${w}`} />
        ))}
      </div>

      {/* Kalendern: sju kolumner, den vy som möter en som klickar sig hit */}
      <div className="bg-navy-900 border border-navy-700 rounded-xl p-4">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {Array.from({ length: 7 }, (_, i) => <Platta key={i} className="h-4" />)}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, i) => <Platta key={i} className="h-10" />)}
        </div>
      </div>
    </div>
  )
}
