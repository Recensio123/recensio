'use client'
import { useEffect, useState } from 'react'
import { useLang } from '@/components/LanguageProvider'
import { Tooltip } from '@/components/Tooltip'

/*
 * One tracking-link section instead of two.
 *
 * The builder and the saved-link list were separate panels asking the salon to
 * understand UTM tagging before either was usable: a source field, a medium
 * dropdown with eleven values including affiliate and audio, a campaign name,
 * an optional term. Four pieces of vocabulary to share a link on Instagram.
 *
 * Everything a salon actually decides is two things — where they will post it,
 * and what it is about. The channel chip sets source and medium together,
 * because those two always move as a pair, and the destination is filled in
 * from their own site rather than left as "https://".
 *
 * The inline edit form went with it. A tagged link that is already out in the
 * world cannot be corrected by editing the row — the copies people clicked
 * still carry the old tags — so editing invited a mistake. Wrong link: delete
 * it and make another.
 */

type SavedLink = {
  id:           string
  full_url:     string
  short_url?:   string
  source:       string
  medium:       string
  campaign:     string
  created_at:   string
  sessions?:    number
  conversions?: number
}

/* Where a salon actually posts. Each chip carries the source and medium pair
   that Google Analytics needs, so neither word has to appear on screen. */
const CHANNELS: { id: string; sv: string; en: string; source: string; medium: string }[] = [
  { id: 'instagram', sv: 'Instagram',      en: 'Instagram',     source: 'instagram',               medium: 'social' },
  { id: 'facebook',  sv: 'Facebook',       en: 'Facebook',      source: 'facebook',                medium: 'social' },
  { id: 'tiktok',    sv: 'TikTok',         en: 'TikTok',        source: 'tiktok',                  medium: 'social' },
  { id: 'gbp',       sv: 'Google-profilen', en: 'Google profile', source: 'google_business_profile', medium: 'organic' },
  { id: 'email',     sv: 'Mejl',           en: 'Email',         source: 'newsletter',              medium: 'email'  },
  { id: 'sms',       sv: 'SMS',            en: 'SMS',           source: 'sms',                     medium: 'sms'    },
  { id: 'print',     sv: 'Skylt eller QR', en: 'Sign or QR',    source: 'print',                   medium: 'offline' },
]

const T = {
  sv: {
    intro:       'Märk en länk innan du delar den, så ser du sedan hur många besök och förfrågningar just den gav.',
    adsNote:     'Annonser i Google behöver ingen märkning — de spåras automatiskt.',
    where:       'Var ska du dela länken?',
    about:       'Vad handlar det om?',
    aboutPh:     't.ex. sommarkampanj',
    goesTo:      'Länken går till',
    change:      'Ändra',
    done:        'Klar',
    create:      'Skapa länk',
    ready:       'Din länk',
    copy:        'Kopiera',
    copied:      'Kopierat ✓',
    shorten:     'Förkorta',
    shortening:  'Förkortar…',
    shortError:  'Länken kunde inte förkortas',
    listTitle:   'Dina länkar',
    sample:      'Exempeldata',
    visits:      'besök',
    leads:       'förfrågningar',
    remove:      'Ta bort',
    noneYet:     'Du har inga länkar ännu.',
    statTip:     'Besök och förfrågningar för just den här länken, hämtade från Google Analytics.',
    hint:        'Fyll i vad det handlar om för att skapa länken.',
  },
  en: {
    intro:       'Tag a link before you share it, and you can see how many visits and enquiries that one link brought.',
    adsNote:     'Google Ads needs no tagging — those clicks are tracked automatically.',
    where:       'Where will you share it?',
    about:       'What is it about?',
    aboutPh:     'e.g. summer offer',
    goesTo:      'The link goes to',
    change:      'Change',
    done:        'Done',
    create:      'Create link',
    ready:       'Your link',
    copy:        'Copy',
    copied:      'Copied ✓',
    shorten:     'Shorten',
    shortening:  'Shortening…',
    shortError:  'The link could not be shortened',
    listTitle:   'Your links',
    sample:      'Sample data',
    visits:      'visits',
    leads:       'enquiries',
    remove:      'Remove',
    noneYet:     'You have no links yet.',
    statTip:     'Visits and enquiries for this one link, pulled from Google Analytics.',
    hint:        'Say what it is about to create the link.',
  },
}

/* Shaped like the saved rows, so the panel reads true-to-form before the first
   link is made. */
const MOCK: SavedLink[] = [
  { id: 'mock-1', full_url: 'https://example.se/boka?utm_source=instagram&utm_medium=social&utm_campaign=sommarkampanj', short_url: 'bit.ly/4mRp8z', source: 'instagram', medium: 'social', campaign: 'sommarkampanj',  created_at: '2026-07-02T10:00:00Z', sessions: 38, conversions: 3 },
  { id: 'mock-2', full_url: 'https://example.se/boka?utm_source=newsletter&utm_medium=email&utm_campaign=varerbjudande',  short_url: 'bit.ly/3xKq2p', source: 'newsletter', medium: 'email',  campaign: 'varerbjudande', created_at: '2026-05-14T10:00:00Z', sessions: 91, conversions: 8 },
  { id: 'mock-3', full_url: 'https://example.se/boka?utm_source=sms&utm_medium=sms&utm_campaign=paminnelse',              source: 'sms',        medium: 'sms',    campaign: 'paminnelse',    created_at: '2026-03-02T08:00:00Z', sessions: 17, conversions: 2 },
]

/* UTM values travel through URLs, server logs and Analytics reports, so they
   are kept to plain ASCII. Swedish letters are folded rather than dropped —
   stripping them turned "Vår erbjudande" into "vr_erbjudande". */
const FOLD: Record<string, string> = {
  'å': 'a', 'ä': 'a', 'ö': 'o', 'é': 'e', 'è': 'e', 'ü': 'u', 'ø': 'o', 'æ': 'ae',
}

function slug(s: string) {
  return s.trim().toLowerCase()
    .replace(/[åäöéèüøæ]/g, c => FOLD[c] ?? c)
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '')
}

function build(url: string, source: string, medium: string, campaign: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source',   source)
    u.searchParams.set('utm_medium',   medium)
    u.searchParams.set('utm_campaign', slug(campaign))
    return u.toString()
  } catch { return '' }
}

export function LinksTabTest2({ defaultUrl }: { defaultUrl: string }) {
  const { lang } = useLang()
  const sv = lang === 'sv'
  const t  = T[lang]

  const [channel,  setChannel]  = useState(CHANNELS[0])
  const [campaign, setCampaign] = useState('')
  const [url,      setUrl]      = useState(defaultUrl)
  const [editUrl,  setEditUrl]  = useState(false)
  const [made,     setMade]     = useState('')
  const [copied,   setCopied]   = useState(false)
  const [short,    setShort]    = useState('')
  const [shorting, setShorting] = useState(false)
  const [shortErr, setShortErr] = useState('')

  const [links,     setLinks]     = useState<SavedLink[] | null>(null)
  const [usingMock, setUsingMock] = useState(false)
  const [copiedRow, setCopiedRow] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/tools/utm-links')
      .then(r => r.json())
      .then(j => {
        if (!alive) return
        if (j.links?.length) { setLinks(j.links); setUsingMock(false) }
        else                 { setLinks(MOCK);    setUsingMock(true)  }
      })
      .catch(() => { if (alive) { setLinks(MOCK); setUsingMock(true) } })
    return () => { alive = false }
  }, [])

  const canCreate = !!campaign.trim() && url.startsWith('http')

  async function create() {
    if (!canCreate) return
    const full = build(url, channel.source, channel.medium, campaign)
    if (!full) return
    setMade(full); setShort(''); setShortErr(''); setCopied(false)

    const row: SavedLink = {
      id: `local-${Date.now()}`, full_url: full, source: channel.source,
      medium: channel.medium, campaign: slug(campaign), created_at: new Date().toISOString(),
    }
    try {
      const res = await fetch('/api/tools/utm-links', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_url: full, source: channel.source, medium: channel.medium, campaign: slug(campaign) }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setLinks(l => [{ ...row, id: json.link?.id ?? row.id }, ...(usingMock ? [] : l ?? [])])
        setUsingMock(false)
      }
    } catch { /* the link is built and copyable either way */ }
  }

  async function shorten() {
    if (!made) return
    setShorting(true); setShortErr('')
    try {
      const res  = await fetch('/api/tools/shorten', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ url: made }),
      })
      const json = await res.json()
      if (!res.ok || !json.short_url) throw new Error()
      setShort(json.short_url)
    } catch { setShortErr(t.shortError) } finally { setShorting(false) }
  }

  async function remove(id: string) {
    if (usingMock) { setLinks(l => (l ?? []).filter(x => x.id !== id)); return }
    const res = await fetch(`/api/tools/utm-links/${id}`, { method: 'DELETE' })
    if (res.ok) setLinks(l => (l ?? []).filter(x => x.id !== id))
  }

  const shareUrl = short || made
  const label = (l: SavedLink) =>
    CHANNELS.find(c => c.source === l.source)?.[sv ? 'sv' : 'en'] ?? l.source

  return (
    <div className="bg-navy-800 rounded-2xl border border-navy-700 p-5 space-y-5">

      <div>
        <p className="text-slate-400 text-sm leading-relaxed">{t.intro}</p>
        <p className="text-slate-600 text-xs mt-1">{t.adsNote}</p>
      </div>

      {/* Make one */}
      <div className="bg-navy-900 rounded-xl border border-navy-700 p-4 space-y-3">
        <div>
          <p className="text-slate-500 text-xs mb-2">{t.where}</p>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map(c => (
              <button
                key={c.id}
                onClick={() => { setChannel(c); setMade('') }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  channel.id === c.id
                    ? 'bg-mustard text-navy-950 border-mustard font-semibold'
                    : 'text-slate-400 border-navy-700 hover:border-navy-600 hover:text-slate-200'
                }`}
              >
                {sv ? c.sv : c.en}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-slate-500 text-xs block mb-1">{t.about}</label>
            <input
              value={campaign}
              onChange={e => { setCampaign(e.target.value); setMade('') }}
              placeholder={t.aboutPh}
              className="w-full bg-navy-950 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-lg px-3 py-2 focus:outline-none placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={create}
            disabled={!canCreate}
            className="bg-mustard hover:bg-mustard/90 disabled:opacity-40 text-navy-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {t.create}
          </button>
        </div>

        {!canCreate && !made && <p className="text-slate-600 text-xs">{t.hint}</p>}

        {/* Destination — prefilled, changed only if they want to */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-600">{t.goesTo}</span>
          {editUrl ? (
            <>
              <input
                value={url}
                onChange={e => { setUrl(e.target.value); setMade('') }}
                className="flex-1 min-w-[200px] bg-navy-950 border border-navy-700 focus:border-mustard/50 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none font-mono"
              />
              <button onClick={() => setEditUrl(false)} className="text-mustard hover:underline">{t.done}</button>
            </>
          ) : (
            <>
              <span className="text-slate-400 font-mono truncate max-w-[280px]">{url}</span>
              <button onClick={() => setEditUrl(true)} className="text-slate-500 hover:text-slate-300 underline">{t.change}</button>
            </>
          )}
        </div>

        {made && (
          <div className="border-t border-navy-700 pt-3 space-y-2">
            <p className="text-slate-500 text-xs">{t.ready}</p>
            <p className="font-mono text-xs text-slate-300 break-all leading-relaxed">{shareUrl}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="text-xs font-semibold bg-navy-700 hover:bg-navy-600 text-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? t.copied : t.copy}
              </button>
              {!short && (
                <button
                  onClick={shorten}
                  disabled={shorting}
                  className="text-xs text-slate-400 hover:text-white border border-navy-700 hover:border-navy-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {shorting ? t.shortening : t.shorten}
                </button>
              )}
              {shortErr && <span className="text-red-400 text-xs">{shortErr}</span>}
            </div>
          </div>
        )}
      </div>

      {/* What is already out there */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-slate-500 text-xs uppercase tracking-wider font-medium">{t.listTitle}</p>
          {usingMock && (
            <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-1.5 py-0.5 rounded font-medium">{t.sample}</span>
          )}
        </div>

        {links === null ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-navy-900 rounded-lg animate-pulse" />)}
          </div>
        ) : links.length === 0 ? (
          <p className="text-slate-500 text-sm">{t.noneYet}</p>
        ) : (
          <div className="divide-y divide-navy-700 border border-navy-700 rounded-xl overflow-hidden">
            {links.map(l => (
              <div key={l.id} className="px-3 py-2.5 flex items-center gap-3 flex-wrap bg-navy-900">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-white text-sm truncate">{l.campaign.replace(/_/g, ' ')}</p>
                  <p className="text-slate-500 text-xs">
                    {label(l)} · {new Date(l.created_at).toLocaleDateString(sv ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>

                <Tooltip text={t.statTip}>
                  <p className="text-xs text-slate-400 shrink-0 cursor-default tabular-nums">
                    <span className="text-white font-medium">{l.sessions ?? '—'}</span> {t.visits}
                    {' · '}
                    <span className={l.conversions ? 'text-green-400 font-medium' : 'text-white font-medium'}>{l.conversions ?? '—'}</span> {t.leads}
                  </p>
                </Tooltip>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={async () => { await navigator.clipboard.writeText(l.short_url ?? l.full_url); setCopiedRow(l.id); setTimeout(() => setCopiedRow(null), 2000) }}
                    className="text-xs text-slate-500 hover:text-white border border-navy-700 hover:border-navy-600 px-2 py-1 rounded-lg transition-colors"
                  >
                    {copiedRow === l.id ? t.copied : t.copy}
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    className="text-xs text-slate-500 hover:text-red-400 border border-navy-700 hover:border-red-500/30 px-2 py-1 rounded-lg transition-colors"
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
