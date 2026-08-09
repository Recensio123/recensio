'use client'
import { useState } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { useLang, type Lang } from '@/components/LanguageProvider'

type Review = {
  id:         number
  author:     string
  rating:     number
  text:       string
  date:       string
  replied:    boolean
  reply?:     string
  reviewName: string   // GBP resource name used for the reply API
}

const mockReviews: Review[] = [
  { id: 1,  author: 'Anna K.',   rating: 5, date: '2 days ago',   replied: false,
    reviewName: 'accounts/123/locations/456/reviews/1',
    text: 'Excellent service, came within the hour. Very professional and fixed the issue quickly. Will definitely use again!' },
  { id: 2,  author: 'Marcus L.', rating: 2, date: '5 days ago',   replied: false,
    reviewName: 'accounts/123/locations/456/reviews/2',
    text: 'Took much longer than quoted and the price was higher than expected. Not happy with the communication.' },
  { id: 3,  author: 'Sara B.',   rating: 5, date: '1 week ago',   replied: false,
    reviewName: 'accounts/123/locations/456/reviews/3',
    text: 'Really impressed. Clean work, explained everything clearly. Highly recommend.' },
  { id: 4,  author: 'Johan P.',  rating: 4, date: '2 weeks ago',  replied: true,
    reviewName: 'accounts/123/locations/456/reviews/4',
    text: 'Good job overall, minor issue with scheduling but the actual work was great.',
    reply: 'Thank you for the kind words, Johan! Really glad the work met your expectations — we look forward to helping you again.' },
  { id: 5,  author: 'Erik S.',   rating: 1, date: '3 weeks ago',  replied: false,
    reviewName: 'accounts/123/locations/456/reviews/5',
    text: 'Showed up two hours late with no call. Job was done but the mess left behind was unacceptable. Would not use again.' },
  { id: 6,  author: 'Lisa M.',   rating: 5, date: '1 month ago',  replied: true,
    reviewName: 'accounts/123/locations/456/reviews/6',
    text: 'Boiler broke down on a Sunday and they came out within 2 hours. Absolute lifesavers. 5 stars without hesitation.',
    reply: 'So glad we could sort out the boiler quickly before winter, Lisa! Thanks for taking the time to leave a review.' },
  { id: 7,  author: 'David H.',  rating: 3, date: '5 weeks ago',  replied: false,
    reviewName: 'accounts/123/locations/456/reviews/7',
    text: 'Work was fine but communication was poor. Hard to get updates on when they were arriving.' },
  { id: 8,  author: 'Maria L.',  rating: 5, date: '6 weeks ago',  replied: true,
    reviewName: 'accounts/123/locations/456/reviews/8',
    text: 'Used them for a full bathroom renovation. Professional from start to finish, stuck to the timeline and budget.',
    reply: 'Thank you Maria! The bathroom renovation was a big project and we really appreciate your patience throughout.' },
  { id: 9,  author: 'Peter K.',  rating: 4, date: '2 months ago', replied: true,
    reviewName: 'accounts/123/locations/456/reviews/9',
    text: 'Solid work on the kitchen sink replacement. On time, tidy, and reasonably priced.',
    reply: 'Appreciate the feedback, Peter — always good to hear when things go smoothly.' },
  { id: 10, author: 'Karin B.',  rating: 5, date: '2 months ago', replied: true,
    reviewName: 'accounts/123/locations/456/reviews/10',
    text: 'Emergency callout on a Friday evening — burst pipe under the sink. Had it sorted in under an hour. Incredible response time.',
    reply: 'Really glad we could get to you quickly, Karin! Emergency calls are always our priority.' },
]

const REPLY_LIMIT = 4096

// The direct review link for this business — pulled from the GBP location (Place ID)
const REVIEW_LINK = 'https://g.page/r/CXaB2example/review'

const ASK_TEMPLATES: Record<Lang, { id: string; label: string; text: string }[]> = {
  sv: [
    {
      id:    'sms',
      label: 'Sms',
      text:  `Tack för att du valde oss! Det skulle betyda mycket om du ville lämna en snabb Google-recension — det tar bara en minut: ${REVIEW_LINK}`,
    },
    {
      id:    'email',
      label: 'E-post',
      text:  `Hej!\n\nTack för att du anlitade oss — vi hoppas att du är nöjd med resultatet.\n\nOm du har en minut skulle en kort Google-recension betyda mycket för oss. Den hjälper andra kunder att hitta oss och visar hur vi sköter oss:\n${REVIEW_LINK}\n\nTack igen!`,
    },
  ],
  en: [
    {
      id:    'sms',
      label: 'Text message',
      text:  `Thanks for choosing us! It would mean a lot if you could leave us a quick Google review — it only takes a minute: ${REVIEW_LINK}`,
    },
    {
      id:    'email',
      label: 'Email',
      text:  `Hi!\n\nThank you for your business — we hope you're happy with the result.\n\nIf you have a minute, a short Google review would mean a lot to us. It helps other customers find us and lets us know how we did:\n${REVIEW_LINK}\n\nThanks again!`,
    },
  ],
}

const T = {
  sv: {
    reviews:         'recensioner',
    getMoreTitle:    'Få fler recensioner',
    getMoreSub:      'Fler recensioner ger bättre synlighet på Google. Skicka din recensionslänk till nöjda kunder direkt efter ett jobb — de flesta hjälper gärna till när man frågar.',
    hide:            'Dölj',
    askForReviews:   'Be om recensioner',
    copied:          'Kopierad ✓',
    copyLink:        'Kopiera länk',
    copyMessage:     'Kopiera meddelande',
    responseRate1:   'Du har svarat på ',
    responseRate2:   ' av dina recensioner. Företag som svarar på de flesta recensioner upplevs som mer pålitliga av nya kunder.',
    filterAll:       'Alla',
    filterUnanswered:'Obesvarade',
    noReviews:       'Inga recensioner i detta filter.',
    starTooltip:     (rating: number) => `${rating} av 5 stjärnor. ${
      rating >= 4
        ? 'En nöjd kund. Ett varmt, personligt svar uppmuntrar fler att lämna recensioner.'
        : 'En missnöjd kund. Svara lugnt, erkänn vad som gick fel och erbjud att lösa det. Andra som läser ser hur du hanterar problem.'
    }`,
    replied:         'Besvarad',
    repliedTooltip:  'Ditt svar är publicerat på Google. Den här recensionen behöver inget mer.',
    avgTooltip:      'Ditt genomsnittliga stjärnbetyg av alla Google-recensioner. Staplarna visar hur betygen fördelar sig per stjärnnivå.',
    responseTooltip: 'Andelen av dina recensioner du svarat på. Grönt är bra, gult okej, rött för lågt.',
    yourResponse:    'Ditt svar',
    suggestedTooltip:'Ett föreslaget svar skrivet för just den här recensionen. Ändra texten innan du publicerar — något personligt gör det alltid bättre.',
    suggested:       'Föreslaget svar',
    publishing:      'Publicerar…',
    publishResponse: 'Publicera svar',
    failed:          'Misslyckades. Försök igen.',
    charsRemaining:  'tecken kvar',
  },
  en: {
    reviews:         'reviews',
    getMoreTitle:    'Get more reviews',
    getMoreSub:      'More reviews means better visibility on Google. Send your review link to happy customers right after a job — most people are glad to help when asked.',
    hide:            'Hide',
    askForReviews:   'Ask for reviews',
    copied:          'Copied ✓',
    copyLink:        'Copy link',
    copyMessage:     'Copy message',
    responseRate1:   "You've replied to ",
    responseRate2:   ' of your reviews. Businesses that reply to most reviews come across as more trustworthy to new customers.',
    filterAll:       'All',
    filterUnanswered:'Unanswered',
    noReviews:       'No reviews in this filter.',
    starTooltip:     (rating: number) => `${rating} out of 5 stars. ${
      rating >= 4
        ? 'A happy customer. A warm, genuine reply encourages others to leave reviews too.'
        : 'An unhappy customer. Reply calmly, acknowledge what went wrong, and offer to sort it out. Others reading this will see how you handle problems.'
    }`,
    replied:         'Replied',
    repliedTooltip:  'Your reply is published on Google. This review needs nothing more.',
    avgTooltip:      'Your average star rating across all Google reviews. The bars show how ratings are spread per star level.',
    responseTooltip: 'The share of your reviews you have replied to. Green is good, amber is okay, red is too low.',
    yourResponse:    'Your response',
    suggestedTooltip:'A suggested reply written for this specific review. Edit it directly before publishing — adding something personal always makes it better.',
    suggested:       'Suggested response',
    publishing:      'Publishing…',
    publishResponse: 'Publish response',
    failed:          'Failed. Try again.',
    charsRemaining:  'characters remaining',
  },
}

function suggestedReply(review: Review, lang: Lang): string {
  const first = review.author.split(' ')[0]
  if (lang === 'sv') {
    return review.rating >= 4
      ? `Tack så mycket för de fina orden, ${first}! Vi är glada att vi kunde hjälpa till och hoppas att vi ses igen.`
      : `Hej ${first}, tack för att du delade din upplevelse. Vi är ledsna att det inte levde upp till dina förväntningar — vi vill gärna ställa det till rätta. Hör av dig direkt till oss så löser vi det.`
  }
  return review.rating >= 4
    ? `Thank you so much for the kind words, ${first}! We're really glad we could help and look forward to being your go-to plumber in the future.`
    : `Hi ${first}, thank you for taking the time to share your feedback. We're sorry to hear the experience didn't meet your expectations — we'd love to make it right. Please reach out to us directly so we can discuss.`
}

type Filter = 'all' | 'unanswered'

export function ReviewsTabTest2() {
  const { lang } = useLang()
  const t = T[lang]
  const [reviews, setReviews] = useState<Review[]>(mockReviews)
  const [filter,  setFilter]  = useState<Filter>('all')
  const [showAsk, setShowAsk] = useState(false)
  const [copied,  setCopied]  = useState<string | null>(null)

  // Per-review reply text — pre-seeded with suggestion
  const [replies, setReplies] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    mockReviews.filter(r => !r.replied).forEach(r => { init[r.id] = suggestedReply(r, lang) })
    return init
  })

  // Per-review sending state
  const [sending, setSending] = useState<Record<number, 'idle' | 'sending' | 'error'>>({})

  const avgRating       = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  const starCounts      = [5, 4, 3, 2, 1].map(s => ({ star: s, count: reviews.filter(r => r.rating === s).length }))
  const maxStarCount    = Math.max(...starCounts.map(s => s.count), 1)
  const unansweredCount = reviews.filter(r => !r.replied).length
  const responseRate    = Math.round(((reviews.length - unansweredCount) / reviews.length) * 100)

  const filtered = reviews
    .filter(r => filter === 'unanswered' ? !r.replied : true)
    .sort((a, b) => a.id - b.id)   // lower id = more recent in mock; real data sorts by publishedAt desc

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: 'all',        label: t.filterAll,        count: reviews.length  },
    { id: 'unanswered', label: t.filterUnanswered, count: unansweredCount },
  ]

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function publishReply(review: Review) {
    const comment = replies[review.id]?.trim()
    if (!comment) return
    setSending(prev => ({ ...prev, [review.id]: 'sending' }))
    try {
      const res = await fetch('/api/reviews/reply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewName: review.reviewName, comment }),
      })
      if (!res.ok) throw new Error()
      setReviews(prev => prev.map(r =>
        r.id === review.id ? { ...r, replied: true, reply: comment } : r
      ))
      setSending(prev => ({ ...prev, [review.id]: 'idle' }))
    } catch {
      setSending(prev => ({ ...prev, [review.id]: 'error' }))
    }
  }

  return (
    <div className="space-y-5">

      {/* Rating summary */}
      <div className="bg-navy-800 rounded-xl border border-navy-700 p-5">
        <div className="flex items-start gap-5 sm:gap-8">
          <div className="shrink-0 text-center">
            <Tooltip text={t.avgTooltip}>
              <p className="text-white text-4xl font-bold tabular-nums leading-none cursor-default">{avgRating.toFixed(1)}</p>
            </Tooltip>
            <p className="text-mustard text-base mt-1.5 leading-none">
              {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
            </p>
            <p className="text-slate-500 text-xs mt-1.5">{reviews.length} {t.reviews}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {starCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2.5">
                <span className="text-xs text-slate-500 w-5 text-right tabular-nums">{star}★</span>
                <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mustard/70 rounded-full transition-all"
                    style={{ width: `${(count / maxStarCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-4 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ask for reviews */}
      <div className="bg-navy-800 rounded-xl border border-mustard/20 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-white text-sm font-medium">{t.getMoreTitle}</p>
            <p className="text-slate-500 text-xs mt-1">
              {t.getMoreSub}
            </p>
          </div>
          <button
            onClick={() => setShowAsk(v => !v)}
            className="shrink-0 text-xs bg-mustard hover:bg-mustard-light text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {showAsk ? t.hide : t.askForReviews}
          </button>
        </div>

        {showAsk && (
          <div className="mt-4 space-y-4">
            {/* Review link */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-xs text-slate-300 truncate font-mono">
                {REVIEW_LINK}
              </div>
              <button
                onClick={() => copyText('link', REVIEW_LINK)}
                className="shrink-0 text-xs text-mustard border border-mustard/30 hover:bg-mustard/10 px-3 py-2.5 rounded-lg transition-colors"
              >
                {copied === 'link' ? t.copied : t.copyLink}
              </button>
            </div>

            {/* Ready-made messages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ASK_TEMPLATES[lang].map(tpl => (
                <div key={tpl.id} className="bg-navy-900 border border-navy-600 rounded-lg p-3 flex flex-col">
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{tpl.label}</p>
                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-line flex-1">{tpl.text}</p>
                  <button
                    onClick={() => copyText(tpl.id, tpl.text)}
                    className="mt-3 self-start text-xs text-mustard border border-mustard/30 hover:bg-mustard/10 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {copied === tpl.id ? t.copied : t.copyMessage}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Response-rate context line */}
      <p className="text-slate-500 text-xs px-1">
        {t.responseRate1}<Tooltip text={t.responseTooltip}><span className={`cursor-default ${responseRate >= 90 ? 'text-green-400' : responseRate >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{responseRate}%</span></Tooltip>{t.responseRate2}
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-navy-700 -mb-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === f.id
                ? 'border-mustard text-mustard'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                filter === f.id ? 'bg-mustard/20 text-mustard' : 'bg-navy-700 text-slate-500'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Review list */}
      <div className="space-y-3 pt-1">
        {filtered.length === 0 && (
          <div className="bg-navy-800 rounded-xl border border-navy-700 p-8 text-center">
            <p className="text-slate-500 text-sm">{t.noReviews}</p>
          </div>
        )}

        {filtered.map(review => {
          const replyText  = replies[review.id] ?? ''
          const charsLeft  = REPLY_LIMIT - replyText.length
          const charColor  = charsLeft < 100 ? 'text-amber-400' : 'text-slate-500'
          const sendStatus = sending[review.id] ?? 'idle'

          return (
            <div
              key={review.id}
              className={`bg-navy-800 rounded-xl p-5 border ${
                review.replied ? 'border-navy-700' : 'border-mustard/20'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">{review.author}</span>
                  <Tooltip text={t.starTooltip(review.rating)}>
                    <span className="text-mustard text-xs cursor-default">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                  </Tooltip>
                  <span className="text-slate-500 text-xs">{review.date}</span>
                </div>
                {review.replied && (
                  <Tooltip text={t.repliedTooltip}>
                    <span className="text-xs text-green-400 shrink-0 cursor-default">{t.replied}</span>
                  </Tooltip>
                )}
              </div>

              {/* Review text */}
              <p className="text-slate-300 text-sm leading-relaxed">{review.text}</p>

              {/* Existing reply */}
              {review.replied && review.reply && (
                <div className="mt-3 pl-4 border-l-2 border-navy-600">
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{t.yourResponse}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{review.reply}</p>
                </div>
              )}

              {/* Reply composer */}
              {!review.replied && (
                <div className="mt-4 space-y-2">
                  <Tooltip text={t.suggestedTooltip}>
                    <p className="text-xs text-mustard cursor-default">{t.suggested}</p>
                  </Tooltip>
                  <textarea
                    value={replyText}
                    onChange={e => setReplies(prev => ({ ...prev, [review.id]: e.target.value }))}
                    maxLength={REPLY_LIMIT}
                    rows={3}
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg p-3 text-xs text-slate-300 leading-relaxed resize-none focus:outline-none focus:border-mustard"
                  />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => publishReply(review)}
                        disabled={!replyText.trim() || sendStatus === 'sending'}
                        className="text-xs bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {sendStatus === 'sending' ? t.publishing : t.publishResponse}
                      </button>
                      {sendStatus === 'error' && (
                        <span className="text-red-400 text-xs">{t.failed}</span>
                      )}
                    </div>
                    <span className={`text-xs tabular-nums ${charColor}`}>{charsLeft} {t.charsRemaining}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
