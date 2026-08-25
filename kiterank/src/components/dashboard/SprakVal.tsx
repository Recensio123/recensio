'use client'
import { useLang, type Lang } from '@/components/LanguageProvider'

/*
 * Vilket språk plattformen talar.
 *
 * Låg tidigare som två små flaggor överst i menyn, bredvid företagsnamnet. Det
 * är en inställning man rör en gång och sedan aldrig mer — och den tog plats
 * på det ställe där ögat letar efter var man är. Här hör den hemma, bland det
 * andra man ställer in en gång.
 *
 * Det här styr gränssnittet, inte hemsidan. Sajtens språk sätts i panelen och
 * är ett annat val: en svensk salong kan mycket väl vilja ha engelsk hemsida.
 */

const T = {
  sv: { rubrik: 'Språk i plattformen', om: 'Gäller menyer och texter här inne — inte din hemsida.' },
  en: { rubrik: 'Platform language',   om: 'Applies to menus and text in here — not to your website.' },
}

export function SprakVal() {
  const { lang, setLang } = useLang()
  const t = T[lang]

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-2xl p-5 space-y-3">
      <div>
        <p className="text-white text-sm font-semibold">{t.rubrik}</p>
        <p className="text-slate-400 text-xs mt-0.5">{t.om}</p>
      </div>
      <div className="flex gap-2">
        {([['sv', '🇸🇪', 'Svenska'], ['en', '🇬🇧', 'English']] as [Lang, string, string][]).map(([l, flagga, namn]) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${
              lang === l
                ? 'border-mustard bg-mustard/10 text-mustard font-semibold'
                : 'border-navy-700 text-slate-400 hover:border-navy-600 hover:text-white'
            }`}
          >
            <span>{flagga}</span>
            {namn}
          </button>
        ))}
      </div>
    </div>
  )
}
