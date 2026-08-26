import Link from 'next/link'

/*
 * Sidfoten för marknadssidorna.
 *
 * Fanns tidigare inskriven i varje sida för sig, vilket betydde att villkoren
 * länkades från tre av fem och integritetspolicyn från två. En sidfot som
 * skiljer sig mellan sidor är inte en sidfot, det är fem gissningar om vad som
 * borde stå där.
 */
export function MarknadsFot() {
  return (
    <footer className="border-t border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-white font-bold text-sm">Kiterank</p>
          <p className="text-white/25 text-xs mt-1 max-w-sm leading-relaxed">
            Hemsida, bokning och marknadsföring för salonger och lokala tjänsteföretag.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-2 text-sm">
          <div className="space-y-2">
            <p className="text-white/30 text-[11px] uppercase tracking-wider">Produkten</p>
            <Link href="/features" className="block text-white/45 hover:text-white transition-colors">Funktioner</Link>
            <Link href="/priser"    className="block text-white/45 hover:text-white transition-colors">Priser</Link>
            <Link href="/faq"      className="block text-white/45 hover:text-white transition-colors">FAQ</Link>
          </div>
          <div className="space-y-2">
            <p className="text-white/30 text-[11px] uppercase tracking-wider">Kiterank</p>
            <Link href="/om-oss"  className="block text-white/45 hover:text-white transition-colors">Om oss</Link>
            <Link href="/guider"  className="block text-white/45 hover:text-white transition-colors">Guider</Link>
            <Link href="/kontakt" className="block text-white/45 hover:text-white transition-colors">Kontakt</Link>
          </div>
          <div className="space-y-2">
            <p className="text-white/30 text-[11px] uppercase tracking-wider">Juridik</p>
            <Link href="/villkor"           className="block text-white/45 hover:text-white transition-colors">Villkor</Link>
            <Link href="/integritetspolicy" className="block text-white/45 hover:text-white transition-colors">Integritetspolicy</Link>
            <Link href="/auth/login"        className="block text-white/45 hover:text-white transition-colors">Logga in</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-5 text-white/20 text-xs">
          © {new Date().getFullYear()} Kiterank. Alla rättigheter förbehållna.
        </div>
      </div>
    </footer>
  )
}
