'use client'
import { useState, useMemo } from 'react'
import { useLang } from '@/components/LanguageProvider'

type UTMFields = {
  url:      string
  source:   string
  medium:   string
  campaign: string
  term:     string
}

// Labels are UI text (per language); source/medium are UTM data values and stay as-is.
const TEMPLATES: { label: { sv: string; en: string }; source: string; medium: string }[] = [
  { label: { sv: 'Google Ads',          en: 'Google Ads'     }, source: 'google',                  medium: 'cpc'         },
  { label: { sv: 'Meta-annonser',       en: 'Meta Ads'       }, source: 'meta',                    medium: 'paid_social' },
  { label: { sv: 'Instagram-inlägg',    en: 'Instagram post' }, source: 'instagram',               medium: 'social'      },
  { label: { sv: 'Facebook-inlägg',     en: 'Facebook post'  }, source: 'facebook',                medium: 'social'      },
  { label: { sv: 'TikTok-inlägg',       en: 'TikTok post'    }, source: 'tiktok',                  medium: 'social'      },
  { label: { sv: 'Mejlkampanj',         en: 'Email campaign' }, source: 'newsletter',              medium: 'email'       },
  { label: { sv: 'Google-profilinlägg', en: 'GBP Post'       }, source: 'google_business_profile', medium: 'organic'     },
  { label: { sv: 'SMS',                 en: 'SMS'            }, source: 'sms',                     medium: 'sms'         },
]

// UI copy — sv primary / en secondary via useLang.
const T = {
  sv: {
    title:        'Skapa spårningslänk',
    intro:        'Märk varje länk du delar — inlägg, mejl, QR-koder — så visar Google Analytics exakt varifrån dina besökare och kunder kom.',
    quickStart:   'Snabbval',
    urlLabel:     'Webbadress',
    urlPlaceholder: 'https://dinsida.se/kontakt',
    sourceLabel:  'Källa',
    sourcePlaceholder: 't.ex. google, instagram, nyhetsbrev',
    sourceHint:   'Vilken plattform eller kanal som skickar trafiken.',
    mediumLabel:  'Kanaltyp',
    mediumEmpty:  'Välj kanaltyp…',
    mediumOptions: {
      cpc:         'cpc — Betald sökning (Google, Bing)',
      paid_social: 'paid_social — Betalda sociala annonser (Meta, TikTok, LinkedIn)',
      social:      'social — Vanliga inlägg i sociala medier',
      email:       'email — Mejlutskick',
      organic:     'organic — Obetalda sökresultat',
      referral:    'referral — Länk från en annan webbplats',
      display:     'display — Bannerannonser',
      video:       'video — Videoannonser',
      affiliate:   'affiliate — Partnerlänkar',
      sms:         'sms — SMS',
      audio:       'audio — Podd- och ljudannonser',
    } as Record<string, string>,
    mediumHint:   'Styr vilken kanal GA4 sorterar trafiken till.',
    campaignLabel: 'Kampanjnamn',
    campaignPlaceholder: 't.ex. varkampanj, akut_hjalp',
    campaignHint: 'Använd samma namn i alla kanaler så kan du jämföra dem.',
    termLabel:    'Sökord',
    optional:     '(valfritt)',
    termPlaceholder: 't.ex. akut+rormokare',
    termHint:     'Sökordet som visade annonsen.',
    required:     '*',
    generate:     'Skapa länk',
    readyLabel:   'Din spårningslänk',
    fillPrompt:   'Fyll i källa, kanaltyp och kampanjnamn för att skapa länken',
    copied:       'Kopierat',
    copyLink:     'Kopiera länk',
    placeholderUrl: 'https://dinsida.se?utm_source=…&utm_medium=…&utm_campaign=…',
    chars:        'tecken',
    shortening:   'Förkortar…',
    shorten:      'Förkorta länken',
    shortenError: 'Länken kunde inte förkortas',
    shortReady:   'Kort länk — redo att dela',
    copy:         'Kopiera',
    adsNote:      'Google Ads behöver inga spårningslänkar — annonsklick spåras automatiskt. Märk allt annat: inlägg, mejl, sms och betalda placeringar utanför Google.',
  },
  en: {
    title:        'UTM Link Builder',
    intro:        'Tag every link you share — social posts, emails, QR codes — so Google Analytics shows you exactly where your traffic and customers came from.',
    quickStart:   'Quick-start',
    urlLabel:     'Website URL',
    urlPlaceholder: 'https://yoursite.com/contact',
    sourceLabel:  'Campaign source',
    sourcePlaceholder: 'e.g. google, instagram, newsletter',
    sourceHint:   'Which platform or channel is sending the traffic.',
    mediumLabel:  'Campaign medium',
    mediumEmpty:  'Select a medium…',
    mediumOptions: {
      cpc:         'cpc — Paid search (Google, Bing)',
      paid_social: 'paid_social — Paid social (Meta, TikTok, LinkedIn)',
      social:      'social — Organic social posts',
      email:       'email — Email campaigns',
      organic:     'organic — Unpaid search results',
      referral:    'referral — Link from another website',
      display:     'display — Banner / display ads',
      video:       'video — Video ads',
      affiliate:   'affiliate — Affiliate / partner links',
      sms:         'sms — Text message',
      audio:       'audio — Podcast / audio ads',
    } as Record<string, string>,
    mediumHint:   'Determines which channel GA4 sorts this traffic into.',
    campaignLabel: 'Campaign name',
    campaignPlaceholder: 'e.g. spring_sale, emergency_services',
    campaignHint: 'Use the same name across channels to compare them.',
    termLabel:    'Campaign term',
    optional:     '(optional)',
    termPlaceholder: 't.ex. balayage+södermalm',
    termHint:     'The keyword that triggered the ad.',
    required:     '*',
    generate:     'Generate link',
    readyLabel:   'Your tagged link',
    fillPrompt:   'Fill in source, medium, and campaign name to generate your link',
    copied:       'Copied',
    copyLink:     'Copy link',
    placeholderUrl: 'https://yoursite.com?utm_source=…&utm_medium=…&utm_campaign=…',
    chars:        'chars',
    shortening:   'Shortening…',
    shorten:      'Shorten link',
    shortenError: 'Could not shorten link',
    shortReady:   'Short link — ready to post',
    copy:         'Copy',
    adsNote:      'Google Ads does not need UTM tags — it tracks clicks automatically. Tag everything else: social posts, emails, SMS, and any paid placements outside Google.',
  },
}

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '_')
}

function buildUTMUrl(f: UTMFields): string {
  if (!f.url.startsWith('http')) return ''
  try {
    const u = new URL(f.url)
    if (f.source.trim())    u.searchParams.set('utm_source',   slugify(f.source))
    if (f.medium.trim())    u.searchParams.set('utm_medium',   slugify(f.medium))
    if (f.campaign.trim())  u.searchParams.set('utm_campaign', slugify(f.campaign))
    if (f.term.trim())      u.searchParams.set('utm_term',     slugify(f.term))
    return u.toString()
  } catch {
    return ''
  }
}

function URLDisplay({ url }: { url: string }) {
  if (!url) return null
  const [base, query] = url.split('?')
  const params = query ? query.split('&') : []
  const COLORS: Record<string, string> = {
    utm_source:   'text-blue-400',
    utm_medium:   'text-green-400',
    utm_campaign: 'text-mustard',
    utm_term:     'text-purple-400',
  }
  return (
    <p className="font-mono text-xs break-all leading-relaxed">
      <span className="text-slate-400">{base}</span>
      {params.length > 0 && (
        <>
          <span className="text-slate-500">?</span>
          {params.map((p, i) => {
            const eq  = p.indexOf('=')
            const key = p.slice(0, eq)
            const val = p.slice(eq + 1)
            return (
              <span key={i}>
                {i > 0 && <span className="text-slate-500">&</span>}
                <span className="text-slate-500">{key}=</span>
                <span className={COLORS[key] ?? 'text-slate-300'}>{decodeURIComponent(val)}</span>
              </span>
            )
          })}
        </>
      )}
    </p>
  )
}

export function UTMBuilder({ onSaved }: { onSaved?: () => void }) {
  const { lang } = useLang()
  const t = T[lang]
  const [fields, setFields] = useState<UTMFields>({
    url: 'https://', source: '', medium: '', campaign: '', term: '',
  })
  const [generated,   setGenerated]   = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [shortUrl,    setShortUrl]    = useState('')
  const [shortening,  setShortening]  = useState(false)
  const [shortError,  setShortError]  = useState('')
  const [copiedShort, setCopiedShort] = useState(false)

  function set(key: keyof UTMFields, value: string) {
    setFields(f => ({ ...f, [key]: value }))
  }

  function setAndReset(key: keyof UTMFields, value: string) {
    set(key, value)
    setGenerated(false)
    setShortUrl('')
    setShortError('')
  }

  function applyTemplate(t: typeof TEMPLATES[number]) {
    setFields(f => ({ ...f, source: t.source, medium: t.medium }))
    setGenerated(false)
    setShortUrl('')
    setShortError('')
  }

  const utmUrl     = useMemo(() => buildUTMUrl(fields), [fields])
  const canGenerate = !!(fields.url.length > 10 && fields.url.startsWith('http') && fields.source.trim() && fields.medium.trim() && fields.campaign.trim())
  const isReady    = generated && canGenerate && !!utmUrl

  const activeTemplate = TEMPLATES.find(t => t.source === fields.source && t.medium === fields.medium)

  async function generate() {
    if (!canGenerate) return
    setGenerated(true); setShortUrl(''); setShortError('')
    try {
      const res  = await fetch('/api/tools/utm-links', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_url: utmUrl, source: fields.source, medium: fields.medium, campaign: fields.campaign, term: fields.term || undefined }),
      })
      if (res.ok) onSaved?.()
    } catch {}
  }

  async function copy() {
    if (!utmUrl) return
    await navigator.clipboard.writeText(utmUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shorten() {
    if (!utmUrl) return
    setShortening(true); setShortError('')
    try {
      const res  = await fetch('/api/tools/shorten', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: utmUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t.shortenError)
      setShortUrl(json.shortUrl)
    } catch (err) {
      setShortError(err instanceof Error ? err.message : t.shortenError)
    } finally {
      setShortening(false)
    }
  }

  async function copyShort() {
    await navigator.clipboard.writeText(shortUrl)
    setCopiedShort(true)
    setTimeout(() => setCopiedShort(false), 2000)
  }

  return (
    <div className="bg-navy-800 rounded-2xl border border-navy-700 p-6 space-y-6">

      <div>
        <h2 className="text-white font-semibold text-base">{t.title}</h2>
        <p className="text-slate-500 text-xs mt-1">
          {t.intro}
        </p>
      </div>

      {/* Quick-start templates */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">{t.quickStart}</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(tpl => (
            <button key={tpl.label.en} onClick={() => applyTemplate(tpl)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeTemplate?.label.en === tpl.label.en
                  ? 'bg-mustard/10 border-mustard/40 text-mustard'
                  : 'bg-navy-900 border-navy-700 text-slate-400 hover:text-white hover:border-navy-600'
              }`}>
              {tpl.label[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t.urlLabel} <span className="text-red-400">{t.required}</span></label>
          <input type="url" value={fields.url} onChange={e => setAndReset('url', e.target.value)}
            placeholder={t.urlPlaceholder}
            className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white placeholder-slate-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none font-mono" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t.sourceLabel} <span className="text-red-400">{t.required}</span></label>
          <input type="text" value={fields.source} onChange={e => setAndReset('source', e.target.value)}
            placeholder={t.sourcePlaceholder}
            className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white placeholder-slate-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none" />
          <p className="text-slate-500 text-xs">{t.sourceHint}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t.mediumLabel} <span className="text-red-400">{t.required}</span></label>
          <select value={fields.medium} onChange={e => setAndReset('medium', e.target.value)}
            className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none appearance-none">
            <option value="" disabled>{t.mediumEmpty}</option>
            {Object.entries(t.mediumOptions).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <p className="text-slate-500 text-xs">{t.mediumHint}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">{t.campaignLabel} <span className="text-red-400">{t.required}</span></label>
          <input type="text" value={fields.campaign} onChange={e => setAndReset('campaign', e.target.value)}
            placeholder={t.campaignPlaceholder}
            className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white placeholder-slate-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none" />
          <p className="text-slate-500 text-xs">{t.campaignHint}</p>
        </div>

        {fields.medium === 'cpc' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{t.termLabel} <span className="text-slate-500 font-normal">{t.optional}</span></label>
            <input type="text" value={fields.term} onChange={e => setAndReset('term', e.target.value)}
              placeholder={t.termPlaceholder}
              className="w-full bg-navy-900 border border-navy-700 focus:border-mustard/50 text-white placeholder-slate-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none" />
            <p className="text-slate-500 text-xs">{t.termHint}</p>
          </div>
        )}

      </div>

      {/* Generate */}
      <button onClick={generate} disabled={!canGenerate}
        className="w-full bg-mustard hover:bg-mustard/90 disabled:opacity-40 disabled:cursor-not-allowed text-navy-950 font-semibold text-sm py-2.5 rounded-xl transition-colors">
        {t.generate}
      </button>

      {/* Output */}
      <div className={`rounded-xl border transition-all ${isReady ? 'border-mustard/30 bg-navy-900' : 'border-navy-700 bg-navy-900/50'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-navy-800">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isReady ? 'bg-green-400' : 'bg-navy-600'}`} />
            <p className="text-xs font-medium text-slate-400">
              {isReady ? t.readyLabel : t.fillPrompt}
            </p>
          </div>
          {isReady && (
            <button onClick={copy}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${copied ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-mustard hover:bg-mustard/90 text-navy-950'}`}>
              {copied
                ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>{t.copied}</>
                : <><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>{t.copyLink}</>
              }
            </button>
          )}
        </div>
        <div className="px-4 py-3.5 min-h-[56px] flex items-start">
          {isReady
            ? <URLDisplay url={utmUrl} />
            : <p className="text-slate-500 text-xs font-mono">{t.placeholderUrl}</p>
          }
        </div>
        {isReady && (
          <div className="px-4 pb-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span><span className="text-blue-400">■</span> source</span>
            <span><span className="text-green-400">■</span> medium</span>
            <span><span className="text-mustard">■</span> campaign</span>
            {fields.term.trim() && <span><span className="text-purple-400">■</span> term</span>}
            <span className="ml-auto">{utmUrl.length} {t.chars}</span>
          </div>
        )}
      </div>

      {/* Shorten */}
      {isReady && !shortUrl && (
        <div className="flex items-center gap-3">
          <button onClick={shorten} disabled={shortening}
            className="flex items-center gap-2 text-sm font-semibold bg-navy-700 hover:bg-navy-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors">
            {shortening
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>{t.shortening}</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/><path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 015.656 0l4-4a4 4 0 01-5.656-5.656l-1.102 1.101"/></svg>{t.shorten}</>
            }
          </button>
          {shortError && <p className="text-red-400 text-xs">{shortError}</p>}
        </div>
      )}

      {shortUrl && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">{t.shortReady}</p>
            <p className="text-white font-mono text-sm font-semibold">{shortUrl}</p>
          </div>
          <button onClick={copyShort}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${copiedShort ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-mustard hover:bg-mustard/90 text-navy-950'}`}>
            {copiedShort
              ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>{t.copied}</>
              : <><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>{t.copy}</>
            }
          </button>
        </div>
      )}

      <p className="text-slate-500 text-xs">
        {t.adsNote}
      </p>

    </div>
  )
}
