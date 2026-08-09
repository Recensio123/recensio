import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('user_id', user.id)
    .single()

  if (!company) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">

      {/* Header */}
      <header className="px-10 py-7 flex items-center justify-between">
        <span className="text-white font-bold text-xl tracking-tight">KiteRank</span>
        <form action="/auth/signout" method="post">
          <button className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
            Sign out
          </button>
        </form>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 -mt-12">
        <p className="text-slate-500 text-sm font-medium mb-2">{company.name}</p>
        <h1 className="text-white text-2xl font-semibold mb-10">Where do you want to go?</h1>

        <div className="grid grid-cols-2 gap-5 w-full max-w-[680px]">

          {/* Marketing Platform */}
          <Link href="/dashboard" className="group">
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 hover:border-mustard/30 transition-all h-full flex flex-col cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-mustard/10 flex items-center justify-center mb-5 shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2"  y="2"  width="7" height="7" rx="1.5" fill="#f0b429" opacity="0.9"/>
                  <rect x="11" y="2"  width="7" height="7" rx="1.5" fill="#f0b429" opacity="0.5"/>
                  <rect x="2"  y="11" width="7" height="7" rx="1.5" fill="#f0b429" opacity="0.5"/>
                  <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#f0b429" opacity="0.2"/>
                </svg>
              </div>
              <h2 className="text-white text-base font-semibold mb-2">Marketing Platform</h2>
              <p className="text-slate-500 text-sm leading-relaxed flex-1">
                Rankings, reviews, ads and analytics. Your weekly action plan to get more customers from Google.
              </p>
              <span className="text-mustard text-sm font-medium mt-6 group-hover:underline">
                Open dashboard →
              </span>
            </div>
          </Link>

          {/* My Website */}
          <Link href="/site-editor" className="group">
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 hover:border-blue-500/30 transition-all h-full flex flex-col cursor-pointer">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5 shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="3" width="16" height="11" rx="2" stroke="#60a5fa" strokeWidth="1.5" fill="none"/>
                  <path d="M7 18h6M10 14v4" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M5 7h3M5 10h6" stroke="#60a5fa" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
                  <circle cx="14" cy="8.5" r="2" fill="#60a5fa" opacity="0.3"/>
                </svg>
              </div>
              <h2 className="text-white text-base font-semibold mb-2">My Website</h2>
              <p className="text-slate-500 text-sm leading-relaxed flex-1">
                Your rented homepage. Edit your brand colors, logo, text and photos — live in minutes.
              </p>
              <span className="text-blue-400 text-sm font-medium mt-6 group-hover:underline">
                Go to editor →
              </span>
            </div>
          </Link>

        </div>
      </main>

    </div>
  )
}
