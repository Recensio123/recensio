import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'

function FeatureBlock({
  id,
  icon,
  label,
  title,
  body,
  bullets,
  reversed = false,
}: {
  id: string
  icon: string
  label: string
  title: string
  body: string
  bullets: string[]
  reversed?: boolean
}) {
  return (
    <section
      id={id}
      className={`max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-14 items-center ${reversed ? 'md:[&>*:first-child]:order-2' : ''}`}
    >
      <div className="space-y-5">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1">
          <span className="text-base">{icon}</span>
          <span className="text-white/50 text-xs font-medium">{label}</span>
        </div>
        <h2 className="text-2xl font-bold text-white leading-snug">{title}</h2>
        <p className="text-white/50 leading-relaxed">{body}</p>
        <ul className="space-y-2.5">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-white/60">
              <span className="text-[#f0b429] mt-0.5 shrink-0 text-xs">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
      {/* Visual placeholder — replace with real screenshots later */}
      <div className="bg-white/3 border border-white/8 rounded-2xl aspect-[4/3] flex items-center justify-center">
        <span className="text-5xl opacity-20">{icon}</span>
      </div>
    </section>
  )
}

export default function FeaturesPage() {
  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center space-y-5">
        <div className="inline-flex items-center gap-2 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-full px-4 py-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-medium">All features in every plan</span>
        </div>
        <h1 className="text-4xl font-bold leading-tight">
          Everything a local service business needs<br className="hidden md:block" />
          <span className="text-[#f0b429]"> to dominate Google.</span>
        </h1>
        <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
          Eight data sources. One dashboard. A plain-English action plan every Monday.
        </p>
        <Link
          href="/auth/login"
          className="inline-block bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-6 py-3 rounded-xl transition-colors text-sm mt-2"
        >
          Start your free trial →
        </Link>
      </section>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* ── Feature blocks ─────────────────────────────────────────────── */}

      <FeatureBlock
        id="gbp"
        icon="✦"
        label="Google Business Profile"
        title="Your Google listing, properly managed."
        body="Your Google Business Profile is the single most important marketing asset for a local service business. Kiterank keeps a daily eye on every element that affects how you appear on Google Maps and in local search."
        bullets={[
          'GBP completeness score vs the top business in your area',
          'Photo count, freshness, and category benchmarks',
          'Post frequency tracking — are you posting enough to stay visible?',
          'Q&A monitoring so no question from a potential customer goes unanswered',
          'Service and attribute completeness check',
        ]}
      />

      <div className="border-t border-white/5" />

      <FeatureBlock
        id="reviews"
        icon="★"
        label="Review Intelligence"
        reversed
        title="Never let a review go unanswered again."
        body="Reviews are the single biggest trust signal for a local business. A business that responds to every review — including negative ones — consistently outranks and outconverts businesses that don't. Kiterank shows every new review the moment it lands."
        bullets={[
          'Instant notification when a new review appears on Google',
          'Sentiment trend — are your reviews getting better or worse over time?',
          'Average rating vs. your top three local competitors',
          'Response rate tracking so you always know if you\'re falling behind',
          'Review velocity — reviews per month compared to competitors',
        ]}
      />

      <div className="border-t border-white/5" />

      <FeatureBlock
        id="local-pack"
        icon="◎"
        label="Local Pack Rankings"
        title="See exactly where you appear on Google Maps."
        body="The local pack — the three businesses Google shows on a map above organic results — captures the majority of clicks for local search queries. Kiterank tracks your position in the local pack for every keyword that matters to your business."
        bullets={[
          'Keyword-by-keyword local pack position tracking',
          'Competitor pack appearances across your tracked terms',
          'Recurring competitor identification — who is always in the pack when you\'re not?',
          'Weekly position change alerts for significant moves',
          'Powered by DataForSEO with daily rank refreshes',
        ]}
      />

      <div className="border-t border-white/5" />

      <FeatureBlock
        id="seo"
        icon="⌕"
        label="SEO & Rankings"
        reversed
        title="Know which keywords are worth fighting for."
        body="Most local businesses rank for dozens of keywords they don't even know about — and miss the ones that actually bring customers. Kiterank pulls your full keyword picture from Google Search Console and shows you where the real opportunities are."
        bullets={[
          'Full keyword list from Google Search Console — every term people use to find you',
          'Position tracking week-on-week so you see momentum (or decline) early',
          'Click-through rate vs. average for your position — are your titles working?',
          'Competitor keyword gap — terms they rank for that you don\'t yet',
          'New and lost keywords this week highlighted at the top of the dashboard',
        ]}
      />

      <div className="border-t border-white/5" />

      <FeatureBlock
        id="ads"
        icon="◈"
        label="Google Ads"
        title="Stop spending on ads that don't work."
        body="Google Ads can be the fastest route to customers for a local service business — or the fastest way to burn budget. Kiterank connects to your Google Ads account and shows you exactly what each campaign is delivering in plain language, not marketing speak."
        bullets={[
          'Total spend, impressions, clicks, and conversions in one view',
          'Cost-per-click and cost-per-conversion by campaign',
          'Wasted spend identification — keywords with clicks but zero conversions',
          'Quality Score monitoring per campaign',
          'Week-on-week and month-on-month performance comparison',
        ]}
      />

      <div className="border-t border-white/5" />

      <FeatureBlock
        id="analytics"
        icon="↗"
        label="Website Analytics"
        reversed
        title="Where do your website visitors actually come from?"
        body="Traffic sources tell you which of your marketing investments are working. Kiterank combines Google Analytics 4 and Search Console into a single view so you can see at a glance whether your organic, paid, and direct traffic is growing — and where visitors drop off."
        bullets={[
          'Sessions, users, and bounce rate — weekly and monthly views',
          'Traffic by source: organic, paid, direct, social, referral',
          'Top landing pages by session volume and goal completion rate',
          'Search Console queries feeding traffic to each landing page',
          'Mobile vs. desktop split and Core Web Vitals summary',
        ]}
      />

      <div className="border-t border-white/5" />

      <FeatureBlock
        id="social"
        icon="⬡"
        label="Social Media"
        reversed
        title="Facebook and Instagram — one view, no switching."
        body="Tracking social across two separate apps is a job in itself. Kiterank pulls Facebook Page and Instagram Business data into a single tab so you can see what's working, what isn't, and when your audience is most active — without logging into either platform."
        bullets={[
          'Follower growth and reach week-on-week for both platforms',
          'Best time to post — when your audience is most active by hour of day',
          'Top posts over the last 90 days ranked by reach and engagement',
          'Post-level engagement rate: reactions, comments, shares vs. reach',
          'Audience location breakdown — where your followers are actually based',
        ]}
      />

      <div className="border-t border-white/5" />

      <FeatureBlock
        id="action-plan"
        icon="✓"
        label="Weekly Action Plan"
        title="Three things to do. Every Monday. Ranked by impact."
        body="Data is only valuable if it changes behaviour. The weekly action plan turns everything Kiterank monitors into a short, prioritised list of tasks — each one linked to a measurable outcome. Not vague advice. Specific actions."
        bullets={[
          'Three tasks per week, ranked by expected ranking or revenue impact',
          'Each task takes under 10 minutes to complete',
          'Plain language — no jargon, no marketing theory',
          'Tasks are personalised to your specific gaps that week',
          'Completion tracking so you can see progress over time',
        ]}
      />

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-[#f0b429]/10 via-transparent to-transparent border border-white/8 rounded-2xl px-10 py-16 text-center space-y-6">
          <h2 className="text-3xl font-bold max-w-xl mx-auto leading-snug">
            All features. One login. 7 days free.
          </h2>
          <p className="text-white/45 max-w-md mx-auto">
            Connect your Google account and your first action plan is ready in under five minutes.
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

      {/* Footer */}
      <footer className="border-t border-white/5">
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
