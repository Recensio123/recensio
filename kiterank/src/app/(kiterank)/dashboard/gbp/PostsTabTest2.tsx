'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang, type Lang } from '@/components/LanguageProvider'

/*
 * Salongsårets rytm.
 *
 * Kalendern var skriven för en rörmokare — pannor i januari, utomhuskranar i
 * maj — mitt i en produkt som annars visar en frisörsalong. Nu följer den det
 * en salong faktiskt lever med: ljusare hår mot sommaren, balen i maj,
 * bruduppsättningar juni till augusti, och december som årets tyngsta månad.
 *
 * `intensity` är hur mycket det är värt att lägga på månaden, 1 till 3.
 */
const SEASONAL: Record<string, { focus: string; focusSv: string; keywords: string[]; intensity: number }> = {
  Jan: { focus: 'Fresh start',        focusSv: 'Nystart',              intensity: 2, keywords: ['ny frisyr', 'klippning nyår']                    },
  Feb: { focus: 'Repair and care',    focusSv: 'Reparera vinterhåret', intensity: 2, keywords: ['keratinbehandling', 'torrt hår behandling']      },
  Mar: { focus: 'Lighter colour',     focusSv: 'Ljusare inför våren',  intensity: 3, keywords: ['balayage', 'slingor vår']                        },
  Apr: { focus: 'Spring colour',      focusSv: 'Vårfärg',              intensity: 3, keywords: ['hårfärgning', 'toning']                          },
  May: { focus: 'Prom and parties',   focusSv: 'Bal och studenten',    intensity: 3, keywords: ['uppsättning bal', 'student frisyr']              },
  Jun: { focus: 'Wedding season',     focusSv: 'Bröllopssäsong',       intensity: 3, keywords: ['bruduppsättning', 'provuppsättning']             },
  Jul: { focus: 'Summer care',        focusSv: 'Sommarvård',           intensity: 1, keywords: ['solskadat hår', 'hårvård sommar']                },
  Aug: { focus: 'Back to routine',    focusSv: 'Tillbaka till rutin',  intensity: 2, keywords: ['klippning efter sommaren', 'toning']             },
  Sep: { focus: 'Autumn colour',      focusSv: 'Höstfärg',             intensity: 3, keywords: ['mörkare hårfärg', 'balayage höst']               },
  Oct: { focus: 'Colour refresh',     focusSv: 'Fylla på färgen',      intensity: 2, keywords: ['slingor', 'hårfärgning höst']                    },
  Nov: { focus: 'Before the holidays',focusSv: 'Inför julen',          intensity: 3, keywords: ['klippning inför jul', 'boka i tid']              },
  Dec: { focus: 'Party season',       focusSv: 'Festsäsong',           intensity: 3, keywords: ['uppsättning fest', 'julfrisyr']                  },
}

function getWeeklyPostIdea(lang: Lang) {
  const now       = new Date()
  const monthKey  = now.toLocaleString('en-GB', { month: 'short' }) as keyof typeof SEASONAL
  const thisMonth = SEASONAL[monthKey]
  const nextDate  = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextKey   = nextDate.toLocaleString('en-GB', { month: 'short' }) as keyof typeof SEASONAL
  const nextMonth = SEASONAL[nextKey]
  const lookAhead = nextMonth && nextMonth.intensity > thisMonth.intensity && now.getDate() > 20
  const season    = lookAhead ? nextMonth : thisMonth
  const label     = lookAhead ? nextKey   : monthKey

  const focus = lang === 'sv' ? season.focusSv : season.focus

  const postText = lang === 'sv'
    ? `${focus} är årets mest hektiska period för ${season.keywords[0]}. ` +
      `Har du problem — eller vill du ligga steget före rusningen — ` +
      `har vi lediga tider den här veckan. Snabb hjälp och tydliga priser. ` +
      `Ring oss eller boka online. [Lägg till ditt telefonnummer eller din bokningslänk här]`
    : `${season.focus} is the busiest time of year for ${season.keywords[0]}. ` +
      `If you're dealing with ${season.keywords[0].toLowerCase()} issues — or want to get ahead before the rush — ` +
      `we have availability this week. Fast response, transparent pricing. ` +
      `Call us or book online. [Add your phone number or booking link here]`

  return {
    label: lang === 'sv'
      ? (lookAhead ? `Ligg steget före ${label}` : `Denna vecka — ${focus}`)
      : (lookAhead ? `Get ahead of ${label}`     : `This week — ${focus}`),
    postText,
    keywords: season.keywords,
    isUrgent: season.intensity === 3,
  }
}

type PostCTAType = 'LEARN_MORE' | 'SIGN_UP' | 'SHOP' | 'ORDER_ONLINE' | 'BOOK' | 'CALL'

const CTA_LABELS: Record<Lang, Record<PostCTAType, string>> = {
  sv: {
    LEARN_MORE:   'Läs mer',
    SIGN_UP:      'Registrera dig',
    SHOP:         'Handla',
    ORDER_ONLINE: 'Beställ online',
    BOOK:         'Boka',
    CALL:         'Ring nu',
  },
  en: {
    LEARN_MORE:   'Learn more',
    SIGN_UP:      'Sign up',
    SHOP:         'Shop',
    ORDER_ONLINE: 'Order online',
    BOOK:         'Book',
    CALL:         'Call now',
  },
}

// The button most local service businesses need — used as the default so
// nobody has to know what a "CTA type" is. A small "Change" link covers the rest.
const DEFAULT_CTA: PostCTAType = 'BOOK'

type PublishedPost = {
  text:         string
  publishedAt:  Date
  ctaType?:     PostCTAType
}

const EXPIRY_DAYS = 180

const INITIAL_POSTS: PublishedPost[] = [
  { text: 'Vårens ljusare toner är här — boka konsultation inför balayage, konsultationen ingår.', publishedAt: new Date('2026-04-10') },
  { text: 'Nu tar vi emot drop in på tisdagar mellan 10 och 14.',  publishedAt: new Date('2026-02-27') },
  { text: 'Hösten är här — dags att fylla på färgen innan den växer ut.',        publishedAt: new Date('2025-10-20') },
]

const T = {
  sv: {
    noPostTitle:     (d: number) => `Inget inlägg på ${Math.round(d / 30)} månader`,
    writeOne:        '+ Skriv ett inlägg',
    noPostSub:       'Ett inlägg i månaden räcker för att din profil ska se aktiv ut — och texten nedan är redan skriven åt dig.',
    ideaTooltip:     'Ett inläggsförslag baserat på vad folk söker efter i din bransch just nu. Regelbundna inlägg håller profilen aktiv — Google väger in det i lokala sökresultat.',
    ideaTitle:       'Veckans inläggsförslag',
    peakTooltip:     'Fler än vanligt söker efter din typ av tjänst den här månaden. Ett inlägg håller profilen aktiv när efterfrågan är som störst.',
    peakBadge:       'Många söker just nu',
    trending:        'Populära sökningar:',
    charsRemaining:  'tecken kvar',
    photoNudge:      'Inlägg med foto får betydligt mer uppmärksamhet på Google.',
    addOne:          'Lägg till →',
    addImage:        '+ Bild',
    addButton:       '+ Knapp på inlägget',
    schedule:        '🕐 Schemalägg',
    publishDate:     'Publiceringsdatum',
    publishTime:     'Tid',
    imageUrl:        'Bildlänk (URL)',
    imagePlaceholder:'https://dinhemsida.se/bilder/inlagg.jpg',
    buttonLabel:     'Knapp på inlägget',
    change:          'Ändra',
    buttonLeads:     'Vart knappen leder',
    ctaPlaceholder:  'https://dinhemsida.se/boka',
    scheduling:      'Schemalägger…',
    publishing:      'Publicerar…',
    scheduleFor:     (d: string) => `Schemalägg till ${d}`,
    publishToGoogle: 'Publicera på Google',
    published:       'Inlägget publicerat ✓',
    scheduled:       'Inlägget schemalagt ✓',
    publishFailed:   'Kunde inte publicera. Försök igen.',
    recentTooltip:   'Dina senaste inlägg på din Google-profil. Inlägg försvinner automatiskt efter 6 månader — Google tar bort dem utan att meddela dig.',
    recentTitle:     'Senaste inläggen',
    statusTooltip:   'Google tar bort inlägg automatiskt efter 6 månader. Färgen visar hur lång tid inlägget har kvar på din profil.',
    ctaBadgeTooltip: 'Knappen som visas på inlägget på Google. Den ger läsaren ett tydligt nästa steg.',
    expiredAgo:      (d: number) => `Utgick för ${d} dagar sedan`,
    expiresIn:       (d: number) => `Utgår om ${d} dagar`,
    activeLeft:      (d: number) => `Aktivt — ${d} dagar kvar`,
  },
  en: {
    noPostTitle:     (d: number) => `No post in ${Math.round(d / 30)} months`,
    writeOne:        '+ Write a post',
    noPostSub:       'One post a month is enough to keep your profile looking active — and the text below is already written for you.',
    ideaTooltip:     'A post idea based on what people are currently searching for in your industry. Posting regularly keeps your profile active — Google uses this as a light ranking signal for local search.',
    ideaTitle:       "This week's post idea",
    peakTooltip:     'More people than usual are searching for your type of service this month. Posting keeps your profile active during peak demand.',
    peakBadge:       'Peak search period',
    trending:        'Trending searches:',
    charsRemaining:  'characters remaining',
    photoNudge:      'Posts with a photo get noticeably more attention on Google.',
    addOne:          'Add one →',
    addImage:        '+ Image',
    addButton:       '+ Button on the post',
    schedule:        '🕐 Schedule',
    publishDate:     'Publish date',
    publishTime:     'Publish time',
    imageUrl:        'Image URL',
    imagePlaceholder:'https://yourwebsite.se/images/post.jpg',
    buttonLabel:     'Button on the post',
    change:          'Change',
    buttonLeads:     'Where the button leads',
    ctaPlaceholder:  'https://yourwebsite.se/boka',
    scheduling:      'Scheduling…',
    publishing:      'Publishing…',
    scheduleFor:     (d: string) => `Schedule for ${d}`,
    publishToGoogle: 'Publish to Google',
    published:       'Post published ✓',
    scheduled:       'Post scheduled ✓',
    publishFailed:   'Failed to publish. Try again.',
    recentTooltip:   'Your most recent posts on your Google listing. Posts expire automatically after 6 months — Google removes them from your profile without any notification.',
    recentTitle:     'Recent posts',
    statusTooltip:   'Google removes posts automatically after 6 months. The colour shows how much time this post has left on your listing.',
    ctaBadgeTooltip: 'The button shown on the post on Google. It gives readers a clear next step.',
    expiredAgo:      (d: number) => `Expired ${d} days ago`,
    expiresIn:       (d: number) => `Expires in ${d} days`,
    activeLeft:      (d: number) => `Active — ${d} days left`,
  },
}

const MAX_CHARS    = 1500
/*
 * Six months, not one.
 *
 * A monthly nudge for something a salon does a few times a year is not a
 * reminder, it is nagging — and a badge that is always lit stops being read.
 * Half a year of silence is when a listing genuinely starts looking closed.
 */
const POST_NUDGE_DAYS = 180
const daysSincePost = 47

export function PostsTabTest2({ compact = false }: {
  /* Inside the combined tab, posting is the smaller half: the composer stays
   * folded away until someone asks for it. */
  compact?: boolean
}) {
  const [composerOpen, setComposerOpen] = useState(false)
  const { lang } = useLang()
  const t = T[lang]
  const idea = getWeeklyPostIdea(lang)

  const [text,         setText]         = useState(idea.postText)
  const [imageUrl,     setImageUrl]     = useState('')
  const [ctaType,      setCtaType]      = useState<PostCTAType>(DEFAULT_CTA)
  const [ctaUrl,       setCtaUrl]       = useState('')
  const [showImage,    setShowImage]    = useState(false)
  const [showCta,      setShowCta]      = useState(false)
  const [changingCta,  setChangingCta]  = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [posts,        setPosts]        = useState<PublishedPost[]>(INITIAL_POSTS)
  const [pubStatus,    setPubStatus]    = useState<'idle' | 'publishing' | 'done' | 'error' | 'scheduled'>('idle')

  const charsLeft   = MAX_CHARS - text.length
  const charColor   = charsLeft < 20 ? 'text-red-400' : charsLeft < 100 ? 'text-amber-400' : 'text-slate-500'
  const canPublish  = text.trim().length > 0 && charsLeft >= 0 && pubStatus !== 'publishing'
  const isScheduled = showSchedule && !!scheduleDate
  const now         = new Date()

  async function publish() {
    if (!canPublish) return
    setPubStatus('publishing')

    // Build scheduled ISO string if scheduling is enabled
    let scheduledAt: string | undefined
    if (isScheduled) {
      const dt = new Date(`${scheduleDate}T${scheduleTime}`)
      if (!isNaN(dt.getTime()) && dt > new Date()) {
        scheduledAt = dt.toISOString()
      }
    }

    try {
      const res = await fetch('/api/gbp/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          text:        text.trim(),
          imageUrl:    showImage && imageUrl.trim() ? imageUrl.trim() : undefined,
          ctaType:     showCta ? ctaType : undefined,
          ctaUrl:      showCta && ctaUrl.trim() ? ctaUrl.trim() : undefined,
          scheduledAt,
        }),
      })
      if (!res.ok) throw new Error()

      if (scheduledAt) {
        setPubStatus('scheduled')
        setTimeout(() => setPubStatus('idle'), 4000)
      } else {
        setPosts(prev => [{
          text:        text.trim(),
          publishedAt: new Date(),
          ctaType:     showCta ? ctaType : undefined,
        }, ...prev])
        setPubStatus('done')
        setTimeout(() => setPubStatus('idle'), 3000)
      }
    } catch {
      setPubStatus('error')
    }
  }

  return (
    <div className="space-y-6">

      {/* Nudge — monthly cadence, not a weekly treadmill */}
      {daysSincePost > POST_NUDGE_DAYS && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-400 shrink-0 mt-0.5">●</span>
          <div>
            <p className="text-amber-400 text-sm font-medium">{t.noPostTitle(daysSincePost)}</p>
            <p className="text-slate-500 text-xs mt-0.5">
              {t.noPostSub}
            </p>
          </div>
        </div>
      )}

      {compact && !composerOpen && (
        <button
          onClick={() => setComposerOpen(true)}
          className="w-full bg-navy-800 border border-navy-700 hover:border-navy-500 text-slate-300 hover:text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          {t.writeOne}
        </button>
      )}

      {/* Post composer */}
      <div className={compact && !composerOpen ? 'hidden' : undefined}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Tooltip text={t.ideaTooltip}>
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">{t.ideaTitle}</h2>
          </Tooltip>
          {idea.isUrgent && (
            <Tooltip text={t.peakTooltip}>
              <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full cursor-default">
                {t.peakBadge}
              </span>
            </Tooltip>
          )}
        </div>

        <div className="bg-navy-800 rounded-xl p-5 border border-mustard/20 space-y-4">

          {/* Header row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-white text-sm font-medium">{idea.label}</p>
            <div className="text-right shrink-0">
              <Tooltip text={lang === 'sv'
                ? 'Fraserna folk just nu skriver in på Google när de letar efter en tjänst som din.'
                : 'The phrases people are currently typing into Google when looking for a service like yours.'}>
                <p className="text-slate-500 text-xs cursor-default">{t.trending}</p>
              </Tooltip>
              {idea.keywords.map(k => (
                <p key={k} className="text-mustard text-xs">{k}</p>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div>
            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setPubStatus('idle') }}
              maxLength={MAX_CHARS}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-mustard"
              rows={4}
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs tabular-nums ${charColor}`}>{charsLeft} {t.charsRemaining}</span>
            </div>
          </div>

          {/* Photo nudge */}
          {!showImage && (
            <div className="bg-navy-900/60 border border-navy-700 rounded-lg px-3 py-2.5 flex items-center gap-3 flex-wrap">
              <span className="text-lg shrink-0">📷</span>
              <p className="flex-1 text-slate-400 text-xs min-w-[160px]">{t.photoNudge}</p>
              <button
                type="button"
                onClick={() => setShowImage(true)}
                className="shrink-0 text-xs text-mustard hover:underline"
              >
                {t.addOne}
              </button>
            </div>
          )}

          {/* Optional extras */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowImage(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                showImage
                  ? 'bg-mustard/15 text-mustard border-mustard/30'
                  : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
              }`}
            >
              {t.addImage}
            </button>
            <button
              type="button"
              onClick={() => { setShowCta(v => !v); setChangingCta(false) }}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                showCta
                  ? 'bg-mustard/15 text-mustard border-mustard/30'
                  : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
              }`}
            >
              {t.addButton}
            </button>
            <button
              type="button"
              onClick={() => setShowSchedule(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                showSchedule
                  ? 'bg-mustard/15 text-mustard border-mustard/30'
                  : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
              }`}
            >
              {t.schedule}
            </button>
          </div>

          {/* Schedule date/time picker */}
          {showSchedule && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">{t.publishDate}</label>
                <input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">{t.publishTime}</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Image URL */}
          {showImage && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-500">{t.imageUrl}</label>
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder={t.imagePlaceholder}
                className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none"
              />
            </div>
          )}

          {/* Post button — defaults to Book, no jargon */}
          {showCta && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">{t.buttonLabel}</label>
                {changingCta ? (
                  <select
                    value={ctaType}
                    autoFocus
                    onChange={e => { setCtaType(e.target.value as PostCTAType); setChangingCta(false) }}
                    className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none appearance-none cursor-pointer"
                  >
                    {(Object.keys(CTA_LABELS[lang]) as PostCTAType[]).map(k => (
                      <option key={k} value={k}>{CTA_LABELS[lang][k]}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-3 bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5">
                    <span className="text-white text-sm font-medium">{CTA_LABELS[lang][ctaType]}</span>
                    <button
                      type="button"
                      onClick={() => setChangingCta(true)}
                      className="text-xs text-slate-500 hover:text-mustard transition-colors ml-auto"
                    >
                      {t.change}
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500">{t.buttonLeads}</label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                  placeholder={t.ctaPlaceholder}
                  className="w-full bg-navy-900 border border-navy-600 focus:border-mustard text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Publish / Schedule */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={publish}
              disabled={!canPublish || (isScheduled && !scheduleDate)}
              className="text-sm bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {pubStatus === 'publishing'
                ? (isScheduled ? t.scheduling : t.publishing)
                : isScheduled
                ? t.scheduleFor(scheduleDate || '—')
                : t.publishToGoogle}
            </button>
            {pubStatus === 'done'      && <span className="text-green-400 text-sm">{t.published}</span>}
            {pubStatus === 'scheduled' && <span className="text-green-400 text-sm">{t.scheduled}</span>}
            {pubStatus === 'error'     && <span className="text-red-400 text-sm">{t.publishFailed}</span>}
          </div>

        </div>
      </div>

      {/* Recent posts */}
      <div>
        <Tooltip text={t.recentTooltip}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">{t.recentTitle}</h2>
        </Tooltip>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {posts.map((post, i) => {
            const daysOld  = Math.floor((now.getTime() - post.publishedAt.getTime()) / 86_400_000)
            const daysLeft = EXPIRY_DAYS - daysOld
            const expired  = daysLeft <= 0
            const dateStr  = post.publishedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

            const statusColor = expired        ? 'text-slate-500' :
                                daysLeft <= 14 ? 'text-red-400'   :
                                daysLeft <= 60 ? 'text-amber-400' :
                                'text-green-400'

            const statusLabel = expired
              ? t.expiredAgo(Math.abs(daysLeft))
              : daysLeft <= 14
              ? t.expiresIn(daysLeft)
              : t.activeLeft(daysLeft)

            return (
              <div key={i} className={`px-4 py-4 ${expired ? 'opacity-50' : ''}`}>
                <p className={`text-sm leading-relaxed ${expired ? 'text-slate-500' : 'text-slate-300'}`}>{post.text}</p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-xs text-slate-500">{dateStr}</span>
                  <Tooltip text={t.statusTooltip}>
                    <span className={`text-xs font-medium cursor-default ${statusColor}`}>{statusLabel}</span>
                  </Tooltip>
                  {post.ctaType && (
                    <Tooltip text={t.ctaBadgeTooltip}>
                      <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-1.5 py-0.5 rounded ml-auto cursor-default">
                        {CTA_LABELS[lang][post.ctaType]}
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
