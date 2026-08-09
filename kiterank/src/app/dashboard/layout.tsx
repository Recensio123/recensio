import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TooltipProvider } from '@/components/TooltipProvider'
import { PlanProvider } from '@/components/PlanProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import { DataCoverageProvider } from '@/components/DataCoverageProvider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // New user — hasn't connected Google yet
  if (!company) redirect('/onboarding')

  const { data: snapshot } = company
    ? await admin
        .from('gbp_snapshots')
        .select('review_count, reviews_responded')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    : { data: null }

  const FORCE_MOCK = true
  const unanswered = FORCE_MOCK
    ? 28  // mock: 47 reviews, 19 responded
    : snapshot
      ? Math.max(0, (snapshot.review_count ?? 0) - (snapshot.reviews_responded ?? 0))
      : 0

  return (
    <>
      {/*
        Returning with the back button after visiting an external site (the
        Google lookup, a template preview) restores the page from the browser's
        back-forward cache. React does not always reattach to it, and the page
        arrives looking correct but completely dead to clicks — no error to go
        on. Forcing a fresh load on a restored page costs one reload and avoids
        that. Inline so it works even when hydration is the thing that failed.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `addEventListener('pageshow',function(e){var n=performance.getEntriesByType('navigation')[0];if(e.persisted||(n&&n.type==='back_forward'))location.reload()})`,
        }}
      />
    <PlanProvider>
      <LanguageProvider>
      <DataCoverageProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-navy-950">
          <div className="lg:flex w-full">
            <Sidebar
              companyName={company?.name ?? 'Your business'}
              reviewBadge={unanswered}
              connectionStatus={!company ? 'disconnected' : !snapshot ? 'connected' : 'live'}
            />
            <main className="flex-1 overflow-auto pt-14 lg:pt-0">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
      </DataCoverageProvider>
      </LanguageProvider>
    </PlanProvider>
    </>
  )
}
