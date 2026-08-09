'use client'
import { useState, useMemo } from 'react'

type Platform = 'Google' | 'Reco' | 'Trustpilot'

type Review = {
  id:         string
  platform:   Platform
  reviewer:   string
  rating:     number
  date:       string
  text:       string
  replied:    boolean
  replyText?: string
  reviewName: string   // GBP resource name — used for the API call
}

const MOCK_REVIEWS: Review[] = [
  // Google
  { id: 'g1', platform: 'Google',     reviewer: 'Anna Lindqvist',  rating: 5, date: '2026-05-25', text: 'Fantastiskt bemötande och snabb service. Rekommenderar varmt!',                                                                          replied: true,  replyText: 'Tack så mycket Anna! Roligt att höra att du är nöjd.',           reviewName: 'accounts/123/locations/456/reviews/g1' },
  { id: 'g2', platform: 'Google',     reviewer: 'Erik Johansson',  rating: 4, date: '2026-05-22', text: 'Bra arbete, kom i tid och städade upp efter sig. Lite dyrare än förväntat men kvaliteten är där.',                                      replied: false, reviewName: 'accounts/123/locations/456/reviews/g2' },
  { id: 'g3', platform: 'Google',     reviewer: 'Maria Svensson',  rating: 2, date: '2026-05-18', text: 'Fick vänta tre dagar på återkoppling. Jobbet gjordes bra till slut men kommunikationen kan bli bättre.',                                 replied: false, reviewName: 'accounts/123/locations/456/reviews/g3' },
  { id: 'g4', platform: 'Google',     reviewer: 'Lars Persson',    rating: 5, date: '2026-05-14', text: 'Professionellt och effektivt. Tredje gången vi anlitar dem och aldrig blivit besvikna.',                                                 replied: true,  replyText: 'Tack Lars! Vi ser fram emot att hjälpa dig igen.',               reviewName: 'accounts/123/locations/456/reviews/g4' },
  { id: 'g5', platform: 'Google',     reviewer: 'Helena Åberg',    rating: 3, date: '2026-05-09', text: 'Okej service men svårt att få tag på dem för uppföljning. Kom tillbaka och fixade problemet dock.',                                      replied: false, reviewName: 'accounts/123/locations/456/reviews/g5' },
  // Reco.se — replies not available via API (requires paid subscriber account)
  { id: 'r1', platform: 'Reco',       reviewer: 'Karin Holm',      rating: 5, date: '2026-05-24', text: 'Mycket nöjd! Hantverkarna var trevliga och arbetet blev perfekt utfört. Definitivt värt pengarna.',                                      replied: false, reviewName: '' },
  { id: 'r2', platform: 'Reco',       reviewer: 'Johan Bergström', rating: 4, date: '2026-05-20', text: 'Snabb offert och bra pris. Jobbet tog lite längre tid än planerat men resultatet är bra.',                                               replied: false, reviewName: '' },
  { id: 'r3', platform: 'Reco',       reviewer: 'Petra Nilsson',   rating: 3, date: '2026-05-10', text: 'Okej upplevelse. Inte imponerad men inte missnöjd heller. Priset var rimligt.',                                                          replied: false, reviewName: '' },
  { id: 'r4', platform: 'Reco',       reviewer: 'Anders Ekström',  rating: 5, date: '2026-05-03', text: 'Rekommenderar starkt. Snabb, noggrann och till ett schysst pris. Kommer anlita igen.',                                                   replied: false, reviewName: '' },
  // Trustpilot — replies require enterprise plan ($800+/month)
  { id: 't1', platform: 'Trustpilot', reviewer: 'David Chen',      rating: 5, date: '2026-05-23', text: 'Excellent service from start to finish. Very professional team, arrived on time and the quality of work was outstanding.',                replied: true,  replyText: 'Thank you David! Great to hear.',                               reviewName: '' },
  { id: 't2', platform: 'Trustpilot', reviewer: 'Sophie K.',       rating: 1, date: '2026-05-16', text: 'Very disappointed. Quoted one price then charged significantly more. Would not recommend.',                                               replied: false, reviewName: '' },
  { id: 't3', platform: 'Trustpilot', reviewer: 'Marcus A.',       rating: 4, date: '2026-05-08', text: 'Good work overall. Minor issues with scheduling but the end result was solid.',                                                           replied: true,  replyText: 'Thanks Marcus, appreciate the feedback.',                        reviewName: '' },
]

const PLATFORM_CONFIG: Record<Platform, { color: string; bg: string; border: string }> = {
  Google:     { color: 'text-mustard',   bg: 'bg-mustard/15',   border: 'border-mustard/20'   },
  Reco:       { color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/20' },
  Trustpilot: { color: 'text-blue-400',  bg: 'bg-blue-500/15',  border: 'border-blue-500/20'  },
}

const PLATFORMS: Platform[] = ['Google', 'Reco', 'Trustpilot']

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-mustard text-xs tracking-tight">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function ReplyBox({
  review,
  onSent,
}: {
  review: Review
  onSent: (id: string, text: string) => void
}) {
  const [text,   setText]   = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')

  async function send() {
    if (!text.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/reviews/reply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewName: review.reviewName, comment: text.trim() }),
      })
      if (!res.ok) throw new Error()
      onSent(review.id, text.trim())
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-navy-700">
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setStatus('idle') }}
        placeholder="Write your reply…"
        rows={3}
        className="w-full bg-navy-700 border border-navy-600 focus:border-mustard text-white placeholder-slate-600 text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={send}
          disabled={!text.trim() || status === 'sending'}
          className="bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
        >
          {status === 'sending' ? 'Sending…' : 'Send reply'}
        </button>
        {status === 'error' && <span className="text-red-400 text-xs">Failed to send. Try again.</span>}
        <span className="text-slate-600 text-xs ml-auto">{text.length}/1500</span>
      </div>
    </div>
  )
}

export default function ReviewAggregatorPage() {
  const [reviews,        setReviews]        = useState<Review[]>(MOCK_REVIEWS)
  const [activePlatform, setActivePlatform] = useState<Platform | 'All'>('All')
  const [unansweredOnly, setUnansweredOnly] = useState(false)
  const [openReply,      setOpenReply]      = useState<string | null>(null)

  const stats = useMemo(() => PLATFORMS.map(p => {
    const list = reviews.filter(r => r.platform === p)
    const avg  = list.reduce((s, r) => s + r.rating, 0) / list.length
    return {
      platform:   p,
      total:      list.length,
      avg:        avg.toFixed(1),
      unanswered: list.filter(r => !r.replied).length,
    }
  }), [reviews])

  const filtered = useMemo(() => reviews
    .filter(r => activePlatform === 'All' || r.platform === activePlatform)
    .filter(r => !unansweredOnly || !r.replied)
    .sort((a, b) => b.date.localeCompare(a.date))
  , [reviews, activePlatform, unansweredOnly])

  const totalUnanswered = reviews.filter(r => !r.replied).length

  function handleReplySent(id: string, text: string) {
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, replied: true, replyText: text } : r
    ))
    setOpenReply(null)
  }

  // Can only reply to Google reviews via API
  function canReply(review: Review) {
    return review.platform === 'Google'
  }

  return (
    <div className="px-8 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Review aggregator</h1>
        <p className="text-slate-400 text-sm mt-1">All reviews from Google, Reco.se, and Trustpilot in one feed</p>
      </div>

      {/* Per-platform stats */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        {stats.map(s => {
          const cfg = PLATFORM_CONFIG[s.platform]
          return (
            <div key={s.platform} className={`rounded-xl p-4 border ${cfg.bg} ${cfg.border}`}>
              <p className={`text-xs font-semibold mb-2 ${cfg.color}`}>
                {s.platform === 'Reco' ? 'Reco.se' : s.platform}
              </p>
              <p className="text-white text-2xl font-bold tabular-nums">{s.total}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.avg} avg rating</p>
              {s.unanswered > 0 && (
                <p className="text-red-400 text-xs font-medium mt-1.5">{s.unanswered} unanswered</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['All', ...PLATFORMS] as const).map(p => (
          <button
            key={p}
            onClick={() => setActivePlatform(p)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              activePlatform === p
                ? 'bg-mustard/15 text-mustard border-mustard/30'
                : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
            }`}
          >
            {p === 'Reco' ? 'Reco.se' : p}
          </button>
        ))}
        <div className="w-px h-4 bg-navy-700 mx-1" />
        <button
          onClick={() => setUnansweredOnly(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            unansweredOnly
              ? 'bg-red-500/15 text-red-400 border-red-500/30'
              : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
          }`}
        >
          {unansweredOnly ? `Unanswered (${totalUnanswered})` : 'Unanswered only'}
        </button>
      </div>

      {/* Review feed */}
      <div className="space-y-2 max-w-3xl">
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">No reviews match this filter.</p>
        ) : filtered.map(review => {
          const cfg       = PLATFORM_CONFIG[review.platform]
          const replyOpen = openReply === review.id

          return (
            <div key={review.id} className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                      {review.platform === 'Reco' ? 'Reco.se' : review.platform}
                    </span>
                    <Stars rating={review.rating} />
                    <span className="text-slate-400 text-xs">{review.reviewer}</span>
                    <span className="text-slate-600 text-xs ml-auto">
                      {new Date(review.date).toLocaleDateString('sv-SE')}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{review.text}</p>

                  {/* Existing reply */}
                  {review.replied && review.replyText && (
                    <div className="mt-3 pl-3 border-l-2 border-navy-600">
                      <p className="text-[10px] text-slate-500 mb-1 font-medium">Your reply</p>
                      <p className="text-slate-400 text-sm leading-relaxed">{review.replyText}</p>
                    </div>
                  )}

                  {/* Reply composer */}
                  {replyOpen && canReply(review) && (
                    <ReplyBox review={review} onSent={handleReplySent} />
                  )}
                </div>

                {/* Action column */}
                <div className="shrink-0 mt-0.5 flex flex-col items-end gap-2">
                  {review.replied ? (
                    <span className="text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                      Replied
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                      Needs reply
                    </span>
                  )}
                  {canReply(review) && !review.replied && (
                    <button
                      onClick={() => setOpenReply(replyOpen ? null : review.id)}
                      className="text-[10px] font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      {replyOpen ? 'Cancel' : 'Reply →'}
                    </button>
                  )}
                  {!canReply(review) && !review.replied && (
                    <span className="text-[10px] text-slate-600">Reply via {review.platform}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
