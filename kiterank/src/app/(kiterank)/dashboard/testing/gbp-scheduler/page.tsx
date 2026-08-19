'use client'
import { useState } from 'react'

type PostCTAType = 'LEARN_MORE' | 'SIGN_UP' | 'SHOP' | 'ORDER_ONLINE' | 'BOOK' | 'CALL'

type GBPPost = {
  id:          string
  body:        string
  image_url:   string | null
  cta_type:    PostCTAType | null
  cta_url:     string | null
  status:      'published' | 'failed'
  published_at: string
}

const CTA_LABELS: Record<PostCTAType, string> = {
  LEARN_MORE:   'Learn more',
  SIGN_UP:      'Sign up',
  SHOP:         'Shop',
  ORDER_ONLINE: 'Order online',
  BOOK:         'Book',
  CALL:         'Call now',
}

const MOCK_POSTS: GBPPost[] = [
  {
    id:           'p1',
    body:         'Sommaren är här — vi tar akuta jourjobb alla dagar. Ring oss för snabb hjälp med läckage, stopp och installationer.',
    image_url:    null,
    cta_type:     'CALL',
    cta_url:      null,
    status:       'published',
    published_at: '2026-05-22T09:15:00Z',
  },
  {
    id:           'p2',
    body:         'Nytt: vi erbjuder nu kostnadsfri besiktning av äldre varmvattenberedare i Hägersten och Liljeholmen. Boka tid nedan.',
    image_url:    null,
    cta_type:     'BOOK',
    cta_url:      'https://yourwebsite.se/boka',
    status:       'published',
    published_at: '2026-05-15T14:00:00Z',
  },
  {
    id:           'p3',
    body:         'Tips inför sommaren: kontrollera dina rör innan du åker på semester. En enkel inspektion kan spara dig tusenlappar.',
    image_url:    null,
    cta_type:     'LEARN_MORE',
    cta_url:      'https://yourwebsite.se/tips',
    status:       'published',
    published_at: '2026-05-08T11:30:00Z',
  },
]

const MAX_CHARS = 1500

export default function GBPSchedulerPage() {
  const [body,       setBody]       = useState('')
  const [imageUrl,   setImageUrl]   = useState('')
  const [ctaType,    setCtaType]    = useState<PostCTAType | ''>('')
  const [ctaUrl,     setCtaUrl]     = useState('')
  const [showCta,    setShowCta]    = useState(false)
  const [showImage,  setShowImage]  = useState(false)
  const [posts,      setPosts]      = useState<GBPPost[]>(MOCK_POSTS)
  const [status,     setStatus]     = useState<'idle' | 'publishing' | 'done' | 'error'>('idle')

  const remaining = MAX_CHARS - body.length
  const canPublish = body.trim().length > 0 && remaining >= 0 && status !== 'publishing'

  async function publish() {
    if (!canPublish) return
    setStatus('publishing')
    try {
      const res = await fetch('/api/gbp/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          text:     body.trim(),
          imageUrl: showImage && imageUrl.trim() ? imageUrl.trim() : undefined,
          ctaType:  showCta && ctaType ? ctaType : undefined,
          ctaUrl:   showCta && ctaUrl.trim() ? ctaUrl.trim() : undefined,
        }),
      })
      if (!res.ok) throw new Error()

      // Prepend to local list
      const newPost: GBPPost = {
        id:           crypto.randomUUID(),
        body:         body.trim(),
        image_url:    showImage && imageUrl.trim() ? imageUrl.trim() : null,
        cta_type:     showCta && ctaType ? ctaType as PostCTAType : null,
        cta_url:      showCta && ctaUrl.trim() ? ctaUrl.trim() : null,
        status:       'published',
        published_at: new Date().toISOString(),
      }
      setPosts(prev => [newPost, ...prev])
      setBody('')
      setImageUrl('')
      setCtaType('')
      setCtaUrl('')
      setShowCta(false)
      setShowImage(false)
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="px-8 py-6 space-y-8 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">GBP Post Scheduler</h1>
        <p className="text-slate-400 text-sm mt-1">Compose and publish posts to your Google Business Profile listing</p>
      </div>

      {/* Composer */}
      <div className="bg-navy-800 rounded-2xl border border-navy-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-navy-700">
          <p className="text-white font-medium">New post</p>
          <p className="text-slate-500 text-xs mt-0.5">Posts appear on your Google Business Profile and in local search results</p>
        </div>
        <div className="px-6 py-5 space-y-4">

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Post text</label>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setStatus('idle') }}
              placeholder="Share an update, offer, event, or news about your business…"
              rows={5}
              className="w-full bg-navy-700 border border-navy-600 focus:border-mustard text-white placeholder-slate-600 text-sm rounded-lg px-4 py-3 resize-none focus:outline-none"
            />
            <p className={`text-xs text-right ${remaining < 100 ? 'text-mustard' : 'text-slate-600'}`}>
              {remaining} characters remaining
            </p>
          </div>

          {/* Optional extras */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowImage(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                showImage
                  ? 'bg-mustard/15 text-mustard border-mustard/30'
                  : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
              }`}
            >
              + Image
            </button>
            <button
              type="button"
              onClick={() => setShowCta(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                showCta
                  ? 'bg-mustard/15 text-mustard border-mustard/30'
                  : 'text-slate-400 border-navy-600 hover:border-navy-500 hover:text-white'
              }`}
            >
              + Call to action
            </button>
          </div>

          {/* Image URL */}
          {showImage && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Image URL</label>
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://yourwebsite.se/images/post.jpg"
                className="w-full bg-navy-700 border border-navy-600 focus:border-mustard text-white placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 focus:outline-none"
              />
              <p className="text-slate-600 text-xs">Must be a publicly accessible URL. Minimum 400×300 px recommended.</p>
            </div>
          )}

          {/* CTA */}
          {showCta && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Button type</label>
                <select
                  value={ctaType}
                  onChange={e => setCtaType(e.target.value as PostCTAType | '')}
                  className="w-full bg-navy-700 border border-navy-600 focus:border-mustard text-sm rounded-lg px-4 py-2.5 focus:outline-none appearance-none cursor-pointer"
                  style={{ color: ctaType ? 'white' : 'rgb(71 85 105)' }}
                >
                  <option value="">— Select —</option>
                  {(Object.keys(CTA_LABELS) as PostCTAType[]).map(k => (
                    <option key={k} value={k} style={{ color: 'white' }}>{CTA_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Button URL</label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={e => setCtaUrl(e.target.value)}
                  placeholder="https://yourwebsite.se/boka"
                  className="w-full bg-navy-700 border border-navy-600 focus:border-mustard text-white placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Publish button */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={publish}
              disabled={!canPublish}
              className="bg-mustard hover:bg-mustard-light disabled:opacity-40 text-navy-950 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {status === 'publishing' ? 'Publishing…' : 'Publish now'}
            </button>
            {status === 'done'  && <span className="text-green-400 text-sm">Post published</span>}
            {status === 'error' && <span className="text-red-400 text-sm">Failed to publish. Try again.</span>}
          </div>

        </div>
      </div>

      {/* Post history */}
      <div className="space-y-3">
        <p className="text-white font-medium">Published posts</p>
        {posts.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">No posts yet. Publish your first post above.</p>
        ) : posts.map(post => (
          <div key={post.id} className="bg-navy-800 rounded-xl border border-navy-700 px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-sm leading-relaxed">{post.body}</p>
                <div className="flex items-center gap-3 mt-3">
                  {post.cta_type && (
                    <span className="text-[10px] font-medium text-mustard bg-mustard/10 border border-mustard/20 px-2 py-0.5 rounded">
                      {CTA_LABELS[post.cta_type]}
                    </span>
                  )}
                  {post.image_url && (
                    <span className="text-[10px] font-medium text-slate-400 bg-navy-700 border border-navy-600 px-2 py-0.5 rounded">
                      Image
                    </span>
                  )}
                  <span className="text-slate-600 text-xs ml-auto">
                    {new Date(post.published_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                <span className={`text-[10px] font-medium px-2 py-1 rounded-full border ${
                  post.status === 'published'
                    ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  {post.status === 'published' ? 'Published' : 'Failed'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
