import Link from 'next/link'
import { Nav } from '@/components/marketing/Nav'

const STARTER_FEATURES = [
  'Google Business Profile management',
  'Review monitoring & response drafts',
  'SEO & keyword rankings (Search Console)',
  'Website analytics (GA4 + Search Console)',
  'Weekly action plan — 3 tasks every Monday',
  'Local pack competitor tracking',
  'Citation health check',
  '1 business location',
]

const PRO_FEATURES = [
  'Everything in Starter',
  'Google Ads campaign tracking',
  'Facebook + Instagram analytics',
  'AI search visibility (ChatGPT, Perplexity, Gemini)',
  'Competitor AI mention tracking',
  'DataForSEO backlinks & local ranking grid',
  'Priority support',
  '1 business location',
]

const COMPARISON = [
  { feature: 'Google Business Profile',           starter: true,  pro: true  },
  { feature: 'Review monitoring',                  starter: true,  pro: true  },
  { feature: 'SEO & keyword rankings',             starter: true,  pro: true  },
  { feature: 'Website analytics (GA4 / SC)',       starter: true,  pro: true  },
  { feature: 'Weekly action plan',                 starter: true,  pro: true  },
  { feature: 'Local pack rankings',                starter: true,  pro: true  },
  { feature: 'Citation health check',              starter: true,  pro: true  },
  { feature: 'Google Ads tracking',                starter: false, pro: true  },
  { feature: 'Facebook & Instagram analytics',     starter: false, pro: true  },
  { feature: 'AI search visibility',               starter: false, pro: true  },
  { feature: 'Competitor AI mention tracking',     starter: false, pro: true  },
  { feature: 'DataForSEO backlinks & local grid',  starter: false, pro: true  },
  { feature: 'Priority support',                   starter: false, pro: true  },
]

const FAQS = [
  {
    q: 'Do I need a credit card to start the free trial?',
    a: 'No. Connect your Google account and your trial starts immediately. We only ask for payment details when you decide to continue after the 7 days.',
  },
  {
    q: 'What happens after the 7-day trial?',
    a: 'You choose a plan and enter your payment details. If you do nothing, your account pauses — we do not auto-charge you.',
  },
  {
    q: 'Which Google accounts does Kiterank need access to?',
    a: 'Kiterank needs read access to Google Business Profile, Google Search Console, and (optionally) Google Ads and Google Analytics 4. We never post, spend, or change settings on your behalf without your explicit approval.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. Cancel any time from your account settings. You keep access until the end of the billing period — no cancellation fee.',
  },
  {
    q: 'What if I have more than one business location?',
    a: 'Each plan covers one location. If you manage multiple locations, contact us for a multi-location quote.',
  },
  {
    q: 'Does the AI visibility feature require any additional setup?',
    a: 'No. Kiterank runs the AI platform checks on your behalf using your tracked keywords. No API keys or extra logins required.',
  },
]

export default function PricingPage() {
  return (
    <div className="bg-[#080f1e] text-white min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 text-center space-y-4">
        <h1 className="text-4xl font-bold">Simple pricing. No surprises.</h1>
        <p className="text-white/45 text-lg">
          Cancel any time. No long-term contracts. 7-day free trial on every plan.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-6">

          {/* Starter */}
          <div className="bg-white/3 border border-white/10 rounded-2xl p-8 space-y-6">
            <div>
              <p className="text-white/50 text-sm font-medium mb-1">Starter</p>
              <div className="flex items-end gap-1">
                <p className="text-4xl font-bold text-white">€49</p>
                <p className="text-white/40 text-lg mb-1">/month</p>
              </div>
              <p className="text-white/30 text-xs mt-1">1 business location · billed monthly</p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/60">
              {STARTER_FEATURES.map(f => (
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
              <div className="flex items-end gap-1">
                <p className="text-4xl font-bold text-white">€79</p>
                <p className="text-white/40 text-lg mb-1">/month</p>
              </div>
              <p className="text-white/30 text-xs mt-1">1 business location · billed monthly</p>
            </div>
            <ul className="space-y-2.5 text-sm text-white/60">
              {PRO_FEATURES.map(f => (
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

        <p className="text-center text-white/25 text-sm mt-6">
          7-day free trial on all plans · No credit card required to start
        </p>
      </section>

      {/* Comparison table */}
      <section className="max-w-3xl mx-auto px-6 pb-16 space-y-6">
        <h2 className="text-xl font-bold text-center">Compare plans</h2>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px] bg-white/5 px-6 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
            <span>Feature</span>
            <span className="text-center">Starter</span>
            <span className="text-center text-[#f0b429]">Pro</span>
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_80px_80px] px-6 py-3.5 items-center text-sm border-t border-white/5 ${i % 2 === 0 ? '' : 'bg-white/1'}`}
            >
              <span className="text-white/60">{row.feature}</span>
              <span className="text-center">
                {row.starter
                  ? <span className="text-[#f0b429]">✓</span>
                  : <span className="text-white/15">—</span>}
              </span>
              <span className="text-center">
                {row.pro
                  ? <span className="text-[#f0b429]">✓</span>
                  : <span className="text-white/15">—</span>}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 pb-20 space-y-6">
        <h2 className="text-xl font-bold text-center">Common questions</h2>
        <div className="space-y-4">
          {FAQS.map(item => (
            <div key={item.q} className="bg-white/3 border border-white/8 rounded-xl px-6 py-5 space-y-2">
              <p className="text-sm font-semibold text-white">{item.q}</p>
              <p className="text-sm text-white/50 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-br from-[#f0b429]/10 via-transparent to-transparent border border-white/8 rounded-2xl px-10 py-14 text-center space-y-5">
          <h2 className="text-2xl font-bold">Ready to see where you stand?</h2>
          <p className="text-white/45 max-w-md mx-auto text-sm">
            Connect your Google account and your first action plan is ready in under five minutes.
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-[#f0b429] hover:bg-[#e0a520] text-[#080f1e] font-semibold px-7 py-3 rounded-xl transition-colors text-sm"
          >
            Connect Google free →
          </Link>
          <p className="text-white/25 text-xs">No credit card · Takes 2 minutes · Cancel any time</p>
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
