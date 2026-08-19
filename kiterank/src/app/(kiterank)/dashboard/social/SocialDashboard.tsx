'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { KontonTab } from './KontonTab'
import { StatistikTab } from './StatistikTab'
import type { Connection, SocialPost, SocialStats } from './types'

/*
 * Social media — the accounts and what they produced.
 *
 * A salon that is already posting has the work; what it does not have is any
 * sense of whether the posting is paying off, because each platform keeps its
 * numbers behind its own login and none of them keep history. Connecting the
 * accounts puts the four side by side, next to the visits they send to the
 * website.
 *
 * Which tab opens first follows the state: with nothing connected the accounts
 * are the only thing that can be acted on, so they come up. Once something is
 * connected the numbers are the reason to visit.
 */

const T = {
  sv: {
    konton:    'Konton',
    statistik: 'Statistik',
    intro:     'Koppla dina konton så samlas hur ofta du postar och vad inläggen ger på ett ställe.',
  },
  en: {
    konton:    'Accounts',
    statistik: 'Statistics',
    intro:     'Connect your accounts and how often you post, plus what the posts bring, is gathered in one place.',
  },
}

type Tab = 'konton' | 'statistik'

export function SocialDashboard({ connections, stats, posts, isExample }: {
  connections: Connection[]
  stats:       SocialStats[]
  posts:       SocialPost[]
  isExample:   boolean
}) {
  const { lang } = useLang()
  const t = T[lang]

  const anyConnected = connections.some(c => c.connected)
  const [tab, setTab] = useState<Tab>(anyConnected ? 'statistik' : 'konton')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'konton',    label: t.konton },
    { id: 'statistik', label: t.statistik },
  ]

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">{t.intro}</p>

      <div className="border-b border-navy-700">
        <nav className="flex gap-1">
          {tabs.map(x => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === x.id
                  ? 'text-white border-mustard'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {x.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'konton' && <KontonTab connections={connections} />}
      {tab === 'statistik' && (
        <StatistikTab connections={connections} stats={stats} posts={posts} isExample={isExample} />
      )}
    </div>
  )
}
