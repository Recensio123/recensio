/*
 * Panelens allmänna laddningsvy.
 *
 * Ligger på dashboard-nivå och täcker därför varje sida under den som inte har
 * en egen loading.tsx. Utan en sådan gräns håller Next kvar föregående sida
 * tills servern renderat klart — man klickar i menyn, och i en halv sekund
 * händer ingenting alls. Det ser ut som att klicket missade.
 *
 * Formen är medvetet neutral: rubrik, ett par nyckeltal, två block. Sidorna
 * under panelen ser olika ut, och ett skelett som gissar fel form är sämre än
 * ett som bara säger "något är på väg hit". Den sida som har mycket att vinna
 * på ett skelett som liknar den själv lägger en egen loading.tsx i sin mapp —
 * som bokningar gör.
 */

function Platta({ className }: { className: string }) {
  return <div className={`bg-navy-800 rounded animate-pulse ${className}`} />
}

export default function Loading() {
  return (
    <div className="p-4 sm:p-8 max-w-6xl" aria-busy="true" aria-label="Laddar">
      <div className="mb-6">
        <Platta className="h-7 w-48" />
        <Platta className="h-4 w-72 mt-2" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-navy-900 border border-navy-700 rounded-xl p-4">
            <Platta className="h-3 w-20" />
            <Platta className="h-6 w-16 mt-3" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Platta className="h-40 rounded-xl" />
        <Platta className="h-40 rounded-xl" />
      </div>
    </div>
  )
}
