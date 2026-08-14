'use client'
import { useLang } from '@/components/LanguageProvider'

/*
 * Getting started, for as long as it is still true.
 *
 * The eight things this counts — description, phone, website, hours, cover
 * photo, three own photos, services, attributes — are filled in once and then
 * never touched again. As a permanent tab with a permanent badge they were a
 * chore that never finished; as a card that disappears the day it is done,
 * they are what they actually are: setting up.
 *
 * The two recurring items that used to sit in the same list — posting and
 * collecting reviews — moved out to the attention list, where work that comes
 * back every month belongs.
 */

const T = {
  sv: {
    title:    'Kom igång med din Google-profil',
    intro:    'Åtta uppgifter som fylls i en gång. När de är på plats försvinner den här rutan och du kan ägna dig åt det som återkommer.',
    progress: (p: number, tot: number) => `${p} av ${tot} klara`,
    left:     (n: number) => n === 1 ? '1 punkt kvar' : `${n} punkter kvar`,
    cta:      'Fortsätt uppsättningen',
    start:    'Börja här',
  },
  en: {
    title:    'Get your Google profile set up',
    intro:    'Eight things you fill in once. When they are done this card disappears and you can get on with the work that repeats.',
    progress: (p: number, tot: number) => `${p} of ${tot} done`,
    left:     (n: number) => n === 1 ? '1 item left' : `${n} items left`,
    cta:      'Continue setup',
    start:    'Start here',
  },
}

export function KomIgangKort({ passed, total, onOpen }: {
  passed: number
  total:  number
  onOpen: () => void
}) {
  const { lang } = useLang()
  const t = T[lang]
  const pct = Math.round((passed / total) * 100)

  return (
    <div className="bg-navy-800 rounded-xl border border-mustard/30 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <h2 className="text-white text-base font-semibold">{t.title}</h2>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-xl">{t.intro}</p>
        </div>
        <button
          onClick={onOpen}
          className="shrink-0 bg-mustard hover:bg-mustard-light text-navy-950 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {passed === 0 ? t.start : t.cta} →
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 60 ? 'bg-mustard' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 tabular-nums shrink-0">{t.progress(passed, total)}</span>
        <span className="text-xs text-slate-600 shrink-0">·</span>
        <span className="text-xs text-slate-500 shrink-0">{t.left(total - passed)}</span>
      </div>
    </div>
  )
}
