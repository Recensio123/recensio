'use client'
import { useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { useNu } from '@/components/useNu'

type Props = {
  lastSynced?: string | null
  endpoint?: string
  label?: string
}

const T = {
  sv: {
    idle:       'Synka nu',
    syncing:    'Synkar…',
    done:       'Synkat!',
    error:      'Misslyckades — försök igen',
    lastSynced: 'Senast synkad',
    justNow:    'nyss',
    minAgo:     (m: number) => `${m} min sedan`,
    hoursAgo:   (h: number) => `${h} tim sedan`,
  },
  en: {
    idle:       'Sync now',
    syncing:    'Syncing…',
    done:       'Synced!',
    error:      'Failed — retry',
    lastSynced: 'Last synced',
    justNow:    'just now',
    minAgo:     (m: number) => `${m}m ago`,
    hoursAgo:   (h: number) => `${h}h ago`,
  },
}

export function SyncButton({ lastSynced, endpoint = '/api/gbp/sync', label }: Props) {
  const { lang } = useLang()
  const nu = useNu()
  const L = T[lang]
  const [state, setState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [syncedAt, setSyncedAt] = useState<Date | null>(
    lastSynced ? new Date(lastSynced) : null
  )

  async function sync() {
    setState('syncing')
    try {
      const res = await fetch(endpoint, { method: 'POST' })
      if (res.ok) {
        setSyncedAt(new Date())
        setState('done')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  const labels = { idle: label ?? L.idle, syncing: L.syncing, done: L.done, error: L.error }
  const colors = {
    idle:    'bg-navy-700 hover:bg-navy-600 text-white',
    syncing: 'bg-navy-700 text-slate-400 cursor-wait',
    done:    'bg-green-500/20 text-green-400',
    error:   'bg-red-500/20 text-red-400',
  }

  /* Datumet står sig utan klockan; "för 3 minuter sedan" gör det inte. Före
     montering skrivs därför datumet ut, och den relativa tiden tar över när
     webbläsaren kan svara på vad klockan är. */
  function fmt(date: Date) {
    const datum = date.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-SE')
    if (nu === null) return datum
    const diff = Math.floor((nu - date.getTime()) / 1000)
    if (diff < 60)    return L.justNow
    if (diff < 3600)  return L.minAgo(Math.floor(diff / 60))
    if (diff < 86400) return L.hoursAgo(Math.floor(diff / 3600))
    return datum
  }

  return (
    <div className="flex items-center flex-wrap gap-3">
      <button
        onClick={sync}
        disabled={state === 'syncing'}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${colors[state]}`}
      >
        {labels[state]}
      </button>
      {syncedAt && (
        <span className="text-xs text-slate-500">{L.lastSynced} {fmt(syncedAt)}</span>
      )}
    </div>
  )
}
