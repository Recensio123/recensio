'use client'
import { useLang } from '@/components/LanguageProvider'
import { YOU, MOCK_COMPETITORS, MOCK_PACK } from './CompetitorsTabTest2'

/*
 * The neighbourhood, in two lines.
 *
 * A whole tab for competitors gave a salon owner something to read but
 * nothing to do — and it sat in the menu competing with the three things
 * that are actual work. What matters weekly is one question: am I still on
 * the first screen, and is anyone pulling away. The rest of the comparison
 * is a click behind this card for whoever wants it.
 */

const T = {
  sv: {
    title:    'Salongerna omkring dig',
    position: (pos: number, tot: number) => `Du ligger ${pos === 1 ? 'först' : pos === 2 ? 'tvåa' : `${pos}:a`} av ${tot}`,
    outside:  'Du syns inte bland de tre översta',
    when:     (kw: string) => `när någon söker "${kw}"`,
    race:     (name: string, theirs: number, yours: number) =>
      `${name} fick ${theirs} nya recensioner den här månaden. Du fick ${yours}.`,
    raceAhead: (yours: number, theirs: number) =>
      `Du fick ${yours} nya recensioner den här månaden — fler än någon annan i närheten (${theirs}).`,
    more:     'Se alla salonger omkring dig',
  },
  en: {
    title:    'The salons around you',
    position: (pos: number, tot: number) => `You are ${pos === 1 ? 'first' : `number ${pos}`} of ${tot}`,
    outside:  'You are not in the top three',
    when:     (kw: string) => `when someone searches "${kw}"`,
    race:     (name: string, theirs: number, yours: number) =>
      `${name} got ${theirs} new reviews this month. You got ${yours}.`,
    raceAhead: (yours: number, theirs: number) =>
      `You got ${yours} new reviews this month — more than anyone nearby (${theirs}).`,
    more:     'See all the salons around you',
  },
}

export function KonkurrentKort({ onOpen }: { onOpen: () => void }) {
  const { lang } = useLang()
  const t = T[lang]

  const spot    = MOCK_PACK.spots.find(s => s.isYou)
  const fastest = [...MOCK_COMPETITORS].sort((a, b) => b.newReviews - a.newReviews)[0]
  const ahead   = YOU.newReviews >= fastest.newReviews

  return (
    <div className="bg-navy-800 rounded-xl border border-navy-700 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t.title}</p>
        <button
          onClick={onOpen}
          className="text-xs text-mustard hover:text-mustard-light font-medium transition-colors"
        >
          {t.more} →
        </button>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-lg font-bold ${spot ? 'text-white' : 'text-amber-400'}`}>
          {spot ? t.position(spot.pos, MOCK_PACK.spots.length) : t.outside}
        </span>
        <span className="text-slate-500 text-sm">{t.when(MOCK_PACK.keyword)}</span>
      </div>

      {/* One line of context, because a position without a reason is trivia */}
      <p className={`text-xs mt-2 ${ahead ? 'text-green-400/90' : 'text-slate-400'}`}>
        {ahead
          ? t.raceAhead(YOU.newReviews, fastest.newReviews)
          : t.race(fastest.name, fastest.newReviews, YOU.newReviews)}
      </p>
    </div>
  )
}
