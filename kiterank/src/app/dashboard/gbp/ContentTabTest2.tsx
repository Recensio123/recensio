'use client'
import { useLang } from '@/components/LanguageProvider'
import { PhotosTabTest2 } from './PhotosTabTest2'
import { PostsTabTest2 } from './PostsTabTest2'
import { type MediaItem } from '@/lib/google'

/*
 * Everything you put on the listing, in one place.
 *
 * Photos and posts were two tabs, which made them look like two equal jobs.
 * They are not. A salon uploads photos steadily — every good cut is one —
 * while a post is something you write a few times a year. Splitting them
 * gave posting a permanent half of the menu and an implied weekly deadline
 * nobody was going to meet.
 *
 * So: photos take the page, and posting sits underneath as a folded composer
 * plus whatever has already gone out. The reminder only appears after half a
 * year of silence, which is when a listing genuinely starts looking closed.
 */

const T = {
  sv: {
    postsTitle: 'Inlägg',
    postsIntro: 'Ett par gånger om året räcker. Ett inlägg håller profilen levande utan att bli ett åtagande.',
  },
  en: {
    postsTitle: 'Posts',
    postsIntro: 'A couple of times a year is enough. A post keeps the listing alive without becoming a commitment.',
  },
}

export function ContentTabTest2({ displayItems }: { displayItems: MediaItem[] }) {
  const { lang } = useLang()
  const t = T[lang]

  return (
    <div className="space-y-8">
      <PhotosTabTest2 displayItems={displayItems} />

      <div className="pt-6 border-t border-navy-700">
        <h2 className="text-white text-base font-semibold">{t.postsTitle}</h2>
        <p className="text-slate-500 text-sm mt-0.5 mb-4">{t.postsIntro}</p>
        <PostsTabTest2 compact />
      </div>
    </div>
  )
}
