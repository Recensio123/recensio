const SEASONAL: Record<string, { focus: string; keywords: string[]; intensity: number }> = {
  Jan: { focus: 'Emergency heating',  intensity: 3, keywords: ['emergency boiler repair', 'heating breakdown'] },
  Feb: { focus: 'Winter maintenance', intensity: 2, keywords: ['boiler service', 'pipe insulation'] },
  Mar: { focus: 'Spring checks',      intensity: 2, keywords: ['spring plumbing check', 'annual service'] },
  Apr: { focus: 'Renovation season',  intensity: 3, keywords: ['bathroom renovation', 'new installation'] },
  May: { focus: 'Outdoor plumbing',   intensity: 3, keywords: ['outdoor taps', 'garden plumbing'] },
  Jun: { focus: 'Summer projects',    intensity: 2, keywords: ['kitchen renovation', 'new bathroom'] },
  Jul: { focus: 'Holiday coverage',   intensity: 1, keywords: ['emergency plumber', '24h service'] },
  Aug: { focus: 'Autumn prep',        intensity: 2, keywords: ['heating check', 'boiler service'] },
  Sep: { focus: 'Heating season',     intensity: 3, keywords: ['boiler service', 'heating installation'] },
  Oct: { focus: 'Pre-winter prep',    intensity: 3, keywords: ['boiler installation', 'pipe freeze prevention'] },
  Nov: { focus: 'Winter emergency',   intensity: 3, keywords: ['emergency heating', 'burst pipe'] },
  Dec: { focus: 'Holiday emergency',  intensity: 2, keywords: ['emergency plumber', 'holiday availability'] },
}

function getWeeklyPostIdea() {
  const now       = new Date()
  const monthKey  = now.toLocaleString('en-GB', { month: 'short' }) as keyof typeof SEASONAL
  const thisMonth = SEASONAL[monthKey]

  // Look ahead — if next month's intensity is higher, nudge them to start now
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthKey  = nextMonthDate.toLocaleString('en-GB', { month: 'short' }) as keyof typeof SEASONAL
  const nextMonth     = SEASONAL[nextMonthKey]
  const lookAhead     = nextMonth && nextMonth.intensity > thisMonth.intensity && now.getDate() > 20

  const season  = lookAhead ? nextMonth  : thisMonth
  const label   = lookAhead ? nextMonthKey : monthKey

  const postText = `${season.focus} is the busiest time of year for ${season.keywords[0]}. ` +
    `If you're dealing with ${season.keywords[0].toLowerCase()} issues — or want to get ahead before the rush — ` +
    `we have availability this week. Fast response, transparent pricing. ` +
    `Call us or book online. [Add your phone number or booking link here]`

  return {
    label:    lookAhead ? `Get ahead of ${label}` : `This week — ${season.focus}`,
    postText,
    keywords: season.keywords,
    isUrgent: season.intensity === 3,
  }
}

import { Tooltip } from '@/components/Tooltip'

const daysSincePost = 47
const idea = getWeeklyPostIdea()

export default function PostsPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Posts</h1>
        <p className="text-slate-400 text-sm mt-1">Publish updates directly to your Google Business Profile</p>
      </div>

      {daysSincePost > 7 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg shrink-0">⚠</span>
          <div>
            <p className="text-red-400 text-sm font-medium">You haven&apos;t posted in {daysSincePost} days</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Top performers post at least once a week. Google rewards active profiles with better Maps rankings.
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tooltip text="A post idea based on what people are currently searching for in your industry. Publishing posts about what is relevant right now helps your listing show up more on Google.">
            <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider cursor-default">This week&apos;s post idea</h2>
          </Tooltip>
          {idea.isUrgent && (
            <Tooltip text="More people than usual are searching for your type of service this month. Posting now means your listing is active right when people are most likely to be looking.">
              <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full cursor-default">
                Peak search period
              </span>
            </Tooltip>
          )}
        </div>

        <div className="bg-navy-800 rounded-xl p-5 border border-mustard/20 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-white text-sm font-medium">{idea.label}</p>
            <div className="text-right shrink-0">
              <Tooltip text="The phrases people are currently typing into Google when looking for a service like yours. Mentioning these in your post helps your listing show up for those searches.">
                <p className="text-slate-600 text-xs cursor-default">People are searching for:</p>
              </Tooltip>
              {idea.keywords.map(k => (
                <p key={k} className="text-mustard text-xs">{k}</p>
              ))}
            </div>
          </div>

          <textarea
            defaultValue={idea.postText}
            className="w-full bg-navy-900 border border-navy-600 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-mustard"
            rows={4}
          />

          <div className="flex gap-3">
            <button className="text-sm bg-mustard hover:bg-mustard-light text-navy-950 font-semibold px-4 py-2 rounded-lg transition-colors">
              Publish to Google
            </button>
          </div>
        </div>
      </div>

      <div>
        <Tooltip text="Your most recent posts on your Google business listing, along with how many times each one was seen.">
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 cursor-default">Recent posts</h2>
        </Tooltip>
        <div className="bg-navy-800 rounded-xl border border-navy-700 divide-y divide-navy-700">
          {[
            { text: 'Spring pipe check special — 10% off all inspections booked in April.', date: '47 days ago', views: 312 },
            { text: 'We now offer same-day emergency callouts 7 days a week in Stockholm.',  date: '3 months ago', views: 489 },
          ].map((post, i) => (
            <div key={i} className="px-4 py-4">
              <p className="text-sm text-slate-300">{post.text}</p>
              <div className="flex gap-4 mt-2">
                <span className="text-xs text-slate-600">{post.date}</span>
                <span className="text-xs text-slate-600">{post.views} views</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
