import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'

// ─── Dashboard preview mockup ─────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-mustard/8 blur-3xl rounded-full scale-90 pointer-events-none" />
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
        {/* Browser chrome */}
        <div className="bg-[#111c2e] px-4 py-3 flex items-center gap-3 border-b border-white/5">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <div className="flex-1 bg-white/5 rounded px-3 py-1 text-[10px] text-white/20 text-center max-w-[180px] mx-auto">
            app.kiterank.com/dashboard
          </div>
        </div>
        {/* App shell */}
        <div className="bg-[#0d1829] flex" style={{ height: 330 }}>
          {/* Sidebar */}
          <div className="w-36 shrink-0 border-r border-white/5 p-3 flex flex-col gap-0.5">
            <p className="text-white text-xs font-bold px-2 py-2 mb-1">Kiterank</p>
            {['Overview', 'GBP', 'SEO', 'Reviews', 'Google Ads', 'Analytics'].map((item, i) => (
              <div key={item} className={`px-2 py-1.5 rounded text-xs ${i === 0 ? 'bg-[#f0b429]/15 text-[#f0b429]' : 'text-white/25'}`}>
                {item}
              </div>
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Google rank',   value: '#2',  sub: '↑ up from #4',  color: '#4ade80' },
                { label: 'Reviews',       value: '4.7★', sub: '31 reviews',   color: '#f0b429' },
                { label: 'Website visits', value: '+18%', sub: 'this month',  color: '#4ade80' },
                { label: 'Actions',       value: '3',   sub: 'this week',      color: '#f8fafc' },
              ].map(c => (
                <div key={c.label} className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-white/30 text-[8px] uppercase tracking-wide">{c.label}</p>
                  <p className="text-base font-bold leading-tight mt-0.5" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-white/20 text-[8px] mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>
            {/* Action plan */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs font-medium text-white/40 mb-2">This week&apos;s action plan</p>
              <div className="space-y-1.5">
                {[
                  { done: false, text: 'Respond to 3 unanswered reviews' },
                  { done: true,  text: 'Publish a Google Business post' },
                  { done: false, text: 'Add photos — 12 below benchmark' },
                ].map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded flex items-center justify-center shrink-0 text-[7px] ${a.done ? 'bg-green-500/25 text-green-400' : 'border border-white/15'}`}>
                      {a.done ? '✓' : ''}
                    </div>
                    <span className={`text-[10px] ${a.done ? 'text-white/20 line-through' : 'text-white/60'}`}>{a.text}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Mini bar chart */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[8px] text-white/25 mb-2">Rankings — last 12 weeks</p>
              <div className="flex items-end gap-1" style={{ height: 44 }}>
                {[38, 45, 42, 55, 52, 61, 58, 68, 64, 76, 72, 84].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 0.52}px`, backgroundColor: i >= 9 ? '#f0b429' : 'rgba(240,180,41,0.2)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-5 hover:border-white/15 transition-colors">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-white text-sm font-semibold mb-1.5">{title}</h3>
      <p className="text-white/45 text-sm leading-relaxed">{body}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="bg-[#080f1e] text-white min-h-screen">

      <Nav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429]" />
            <span className="text-[#f0b429] text-xs font-medium">Built for local service businesses</span>
          </div>

          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">
            More customers<br />from Google.<br />
            <span className="text-[#f0b429]">This week.</span>
          </h1>

          <p className="text-white/55 text-lg leading-relaxed max-w-md">
            Kiterank connects to your Google account and shows you exactly why competitors rank above you — then gives you a plain-language action plan to fix it.
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Connect Google free →
            </Link>
          </div>
          <p className="text-white/25 text-xs">No credit card · Takes 2 minutes · Cancel any time</p>
        </div>

        <DashboardMockup />
      </section>

      {/* ── Industry strip ────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 py-5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/30 text-sm">
          <span className="text-white/20 text-xs uppercase tracking-widest">Used by</span>
          {['Plumbers', 'Electricians', 'Cleaners', 'Locksmiths', 'Painters', 'Roofers', 'Landscapers', 'Mechanics'].map(t => (
            <span key={t} className="text-white/40">{t}</span>
          ))}
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { value: '8',      label: 'connected data sources',   sub: 'GBP, Ads, Analytics, Search Console and more' },
          { value: '47',     label: 'ranking signals tracked',  sub: 'Reviews, photos, posts, keywords, backlinks' },
          { value: '4',      label: 'AI platforms monitored',   sub: 'ChatGPT, Perplexity, Gemini, AI Overviews' },
          { value: 'Weekly', label: 'action plans generated',   sub: 'Plain language. No marketing jargon.' },
        ].map(s => (
          <div key={s.label} className="text-center space-y-1">
            <p className="text-3xl font-bold text-[#f0b429]">{s.value}</p>
            <p className="text-white text-sm font-medium">{s.label}</p>
            <p className="text-white/30 text-xs leading-snug">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Everything your Google presence needs.</h2>
          <p className="text-white/45 max-w-xl mx-auto">One login. Every channel. No spreadsheets.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FeatureCard
            icon="✦"
            title="Google Business Profile"
            body="See your GBP health at a glance — photos, posts, Q&A, and how you compare to the top business in your area."
          />
          <FeatureCard
            icon="★"
            title="Review intelligence"
            body="Monitor every review as it lands. Get a draft response you can post in one click, and never let a negative review go unanswered."
          />
          <FeatureCard
            icon="⌕"
            title="SEO & rankings"
            body="Know every keyword customers use to find you. See which ones are one push away from page 1, and which competitors are blocking you."
          />
          <FeatureCard
            icon="◈"
            title="Google Ads"
            body="Track spend, cost-per-click, and wasted budget in plain numbers. Stop paying for keywords that never convert."
          />
          <FeatureCard
            icon="↗"
            title="Website analytics"
            body="Where visitors come from, what they do, and how many become customers. Connected to Google Analytics 4 and Search Console."
          />
          <FeatureCard
            icon="⬡"
            title="Social media"
            body="Facebook and Instagram performance side by side — followers, post reach, best time to post, and your top content over 90 days."
          />
          <FeatureCard
            icon="✓"
            title="Weekly action plan"
            body="Every Monday you get 3 specific things to do — respond to this review, post on this day, target this keyword. Not theory. Tasks."
          />
          <FeatureCard
            icon="✺"
            title="AI search visibility"
            body="Does ChatGPT recommend your business? Does Perplexity? Track which AI platforms mention you — and which mention your competitors instead."
          />
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Simple pricing. No surprises.</h2>
          <p className="text-white/45">7-day free trial · Cancel any time · No long-term contracts.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Starter */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-8 space-y-6">
            <div>
              <p className="text-white/50 text-sm font-medium mb-1">Starter</p>
              <p className="text-4xl font-bold text-white">€49<span className="text-lg font-normal text-white/40">/month</span></p>
              <p className="text-white/30 text-xs mt-1">1 business location</p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/60">
              {[
                'Google Business Profile management',
                'Reviews monitoring & response drafts',
                'SEO & keyword rankings',
                'Website analytics (GA4 + Search Console)',
                'Weekly action plan — 3 tasks every Monday',
                'Local pack competitor tracking',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-[#f0b429] mt-0.5 shrink-0 text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="block text-center border border-white/15 hover:border-white/30 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Start free trial
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-[#f0b429]/5 border border-[#f0b429]/25 rounded-2xl p-8 space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#f0b429] text-[#080f1e] text-xs font-bold px-3 py-1 rounded-full">
              Most popular
            </div>
            <div>
              <p className="text-[#f0b429] text-sm font-medium mb-1">Pro</p>
              <p className="text-4xl font-bold text-white">€79<span className="text-lg font-normal text-white/40">/month</span></p>
              <p className="text-white/30 text-xs mt-1">1 business location</p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/60">
              {[
                'Everything in Starter',
                'Google Ads campaign tracking',
                'Facebook + Instagram analytics',
                'AI search visibility (ChatGPT, Perplexity, Gemini)',
                'Competitor AI mention tracking',
                'DataForSEO backlinks & local grid',
                'Priority support',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="text-[#f0b429] mt-0.5 shrink-0 text-xs">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="block text-center bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-white/25 text-sm">7-day free trial on all plans · No credit card required to start</p>
          <Link href="/pricing" className="text-[#f0b429]/60 hover:text-[#f0b429] text-xs transition-colors">
            See full plan comparison →
          </Link>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Up and running in under 5 minutes.</h2>
          <p className="text-white/45 max-w-lg mx-auto">No technical setup. No developer needed.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Connect your Google account',
              body: 'One OAuth login gives Kiterank read access to your Google Business Profile, Search Console, and Google Ads. We never post or spend on your behalf without you approving it first.',
            },
            {
              step: '02',
              title: 'We analyse your data daily',
              body: 'Kiterank pulls your rankings, reviews, website traffic, ad spend, and social performance every 24 hours — then runs it against 47 local ranking signals.',
            },
            {
              step: '03',
              title: 'Act on a plain-English plan',
              body: 'Every Monday you get 3 specific actions ranked by impact. Each one takes under 10 minutes. No jargon. No guesswork. Just what to do next.',
            },
          ].map(s => (
            <div key={s.step} className="space-y-3">
              <div className="text-[#f0b429] text-4xl font-bold opacity-40">{s.step}</div>
              <h3 className="text-white text-lg font-semibold">{s.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI highlight ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-[#f0b429]/8 to-transparent border border-[#f0b429]/15 rounded-2xl p-10 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-3 py-1">
              <span className="text-[#f0b429] text-xs font-medium">New in 2025</span>
            </div>
            <h2 className="text-2xl font-bold">
              The only dashboard that tracks if AI recommends your business.
            </h2>
            <p className="text-white/50 leading-relaxed">
              People increasingly ask ChatGPT, Perplexity, and Gemini &ldquo;who is the best plumber in Stockholm?&rdquo; Kiterank tests your most important prompts weekly across all four AI platforms and tells you exactly where you appear — and where competitors are showing up instead.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { platform: 'ChatGPT',      color: '#10a37f', mentioned: true,  pos: 3 },
              { platform: 'Perplexity',   color: '#20b2aa', mentioned: true,  pos: 2 },
              { platform: 'Gemini',       color: '#8b5cf6', mentioned: false, pos: null },
              { platform: 'AI Overviews', color: '#4285f4', mentioned: true,  pos: 4 },
            ].map(p => (
              <div key={p.platform} className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium text-white">{p.platform}</span>
                </div>
                {p.mentioned
                  ? <span className="text-xs font-semibold" style={{ color: p.color }}>✓ mentioned at #{p.pos}</span>
                  : <span className="text-white/25 text-xs">not mentioned</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-[#f0b429]/10 via-transparent to-transparent border border-white/8 rounded-2xl px-10 py-16 text-center space-y-6">
          <h2 className="text-3xl font-bold max-w-xl mx-auto leading-snug">
            Your competitors are working on their Google ranking right now.
          </h2>
          <p className="text-white/45 max-w-md mx-auto">
            Find out exactly where you stand — and what to do about it. First action plan ready in under 5 minutes.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/auth/login"
              className="bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Connect Google free →
            </Link>
            <p className="text-white/25 text-xs">No credit card · Takes 2 minutes · Cancel any time</p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 mt-4">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-white font-bold text-sm">Kiterank</p>
            <p className="text-white/25 text-xs mt-0.5">Google marketing for local businesses</p>
          </div>
          <div className="flex items-center gap-8 text-white/30 text-sm">
            <Link href="/features" className="hover:text-white/60 transition-colors">Features</Link>
            <Link href="/pricing"  className="hover:text-white/60 transition-colors">Pricing</Link>
            <Link href="/auth/login" className="hover:text-white/60 transition-colors">Log in</Link>
          </div>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} Kiterank. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
