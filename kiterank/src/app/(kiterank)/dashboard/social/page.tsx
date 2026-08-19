import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { OnlyIn } from '@/components/dashboard/PlanGate'
import { SOCIAL_PLATFORMS, platformConfigured } from '@/lib/socialPlatforms'
import { SocialDashboard } from './SocialDashboard'
import type { Connection, SocialPost, SocialStats } from './types'

/*
 * Sociala medier.
 *
 * Two things are read from the database and one thing from the server
 * environment. The connections table says which accounts this salon has
 * approved; the environment says which platforms we are registered with at all,
 * which decides whether a Koppla button can exist yet.
 *
 * The connections read sits in its own try/catch on purpose. The table arrives
 * with a migration Jakob runs by hand, and a page that throws before the
 * migration lands would take the whole dashboard route down — the same failure
 * that took the published customer sites offline when schema_care was selected
 * before its column existed. Missing table means no connections, which is the
 * truthful answer anyway.
 */

/* A salon that posts a couple of times a week. Shown, clearly marked, until an
   account is connected, so the view can be judged before anyone hands over
   access. Every field maps to something the platform's own API returns:
   followers and per-post likes/comments from Instagram, TikTok and Pinterest
   insights; the weekly cadence counted from the publish dates. */
const exampleStats: SocialStats[] = [
  { platform: 'instagram', followers: 1_240, posts30d: 9,  likes30d: 412, comments30d: 38 },
  { platform: 'tiktok',    followers:   860, posts30d: 6,  likes30d: 970, comments30d: 54 },
  { platform: 'pinterest', followers:   210, posts30d: 12, likes30d:  88, comments30d:  3 },
]

/* Dates are relative to today so the four-week bars stay populated whenever the
   page is opened during the build. */
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
}

const examplePosts: SocialPost[] = [
  { platform: 'instagram', date: daysAgo(1),  kind: 'Reel',  text: 'Balayage från mörkbrunt till ljust — tre timmar, rötterna orörda',     likes:  96, comments: 11, saves: 24 },
  { platform: 'tiktok',    date: daysAgo(2),  kind: 'Video', text: 'Så föner du en lugg som faktiskt lägger sig rätt',                     likes: 310, comments: 22 },
  { platform: 'pinterest', date: daysAgo(4),  kind: 'Pin',   text: 'Uppsättning till bröllop — sex varianter på samma bas',                likes:  14, comments:  0, saves: 31 },
  { platform: 'instagram', date: daysAgo(5),  kind: 'Bild',  text: 'Ny i teamet: Nadia tar färg och klippning på tisdagar och torsdagar',   likes:  61, comments:  8, saves:  2 },
  { platform: 'tiktok',    date: daysAgo(9),  kind: 'Video', text: 'Tre klipp på tre minuter — pojkfrisyrer inför skolstarten',            likes: 244, comments: 17 },
  { platform: 'instagram', date: daysAgo(11), kind: 'Reel',  text: 'Före och efter: slitet blont tillbaka till glans',                     likes: 132, comments:  9, saves: 40 },
  { platform: 'pinterest', date: daysAgo(13), kind: 'Pin',   text: 'Färgkarta höst — de nyanser vi jobbar mest med just nu',               likes:  22, comments:  1, saves: 55 },
  { platform: 'instagram', date: daysAgo(17), kind: 'Bild',  text: 'Kundens val: mjuk slingning med ansiktsramning',                       likes:  58, comments:  4, saves: 12 },
  { platform: 'instagram', date: daysAgo(19), kind: 'Reel',  text: 'Drop-in på torsdagar — så ser en timme i stolen ut',                    likes:  74, comments:  6, saves: 15 },
  { platform: 'tiktok',    date: daysAgo(22), kind: 'Video', text: 'Vad kostar en färgkorrigering, och varför tar den fyra timmar',        likes: 188, comments: 15 },
  { platform: 'pinterest', date: daysAgo(25), kind: 'Pin',   text: 'Kort bob med lugg — tre former för olika ansikten',                    likes:  18, comments:  0, saves: 27 },
]

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: company } = user
    ? await admin.from('companies').select('id').eq('user_id', user.id).single()
    : { data: null }

  let rows: Array<{ platform: string; account_name: string | null; stats_synced_at: string | null }> = []
  if (company) {
    try {
      const { data } = await admin
        .from('social_connections')
        .select('platform, account_name, stats_synced_at')
        .eq('company_id', company.id)
      rows = data ?? []
    } catch {
      // Migration not run yet — no connections, which is also the truth.
    }
  }

  const connections: Connection[] = SOCIAL_PLATFORMS.map(spec => {
    const row = rows.find(r => r.platform === spec.id)
    return {
      platform:   spec.id,
      label:      spec.label,
      configured: platformConfigured(spec),
      connected:  !!row,
      account:    row?.account_name ?? null,
      syncedAt:   row?.stats_synced_at ?? null,
      requires:   spec.requires,
      gives:      spec.gives,
    }
  })

  /* The newest snapshot per platform. Connecting an account does not by itself
     produce numbers — the first sync has to run — so the example stays up,
     marked as an example, until there is something real to replace it with. */
  let stats: SocialStats[] = []
  let posts: SocialPost[]  = []
  if (company) {
    try {
      const { data } = await admin
        .from('social_snapshots')
        .select('platform, followers, posts_30d, likes_30d, comments_30d, posts, synced_at')
        .eq('company_id', company.id)
        .order('synced_at', { ascending: false })

      const newest = new Map<string, NonNullable<typeof data>[number]>()
      for (const row of data ?? []) if (!newest.has(row.platform)) newest.set(row.platform, row)

      stats = [...newest.values()].map(r => ({
        platform:    r.platform as SocialStats['platform'],
        followers:   r.followers   ?? undefined,
        posts30d:    r.posts_30d   ?? undefined,
        likes30d:    r.likes_30d   ?? undefined,
        comments30d: r.comments_30d ?? undefined,
      }))
      posts = [...newest.values()].flatMap(r => (r.posts as SocialPost[] | null) ?? [])
    } catch {
      // Migration not run yet.
    }
  }

  const isExample = stats.length === 0

  return (
    /* Parked. The page is finished but no platform connection is approved yet,
       so it shows nothing a salon can act on — the menu entry is gone and the
       address leads back to the dashboard. Put 'testbok2' in the list below and
       the entry back in Sidebar's nav array to bring it live. */
    <OnlyIn plans={[]}>
      <div className="px-4 sm:px-8 py-6 space-y-6">
        <PageHeader
          titleSv="Sociala medier"
          titleEn="Social media"
          subSv="Hur ofta du postar och vad inläggen ger"
          subEn="How often you post and what the posts bring"
          sample={isExample}
        />

        <SocialDashboard
          connections={connections}
          stats={isExample ? exampleStats : stats}
          posts={isExample ? examplePosts : posts}
          isExample={isExample}
        />
      </div>
    </OnlyIn>
  )
}
