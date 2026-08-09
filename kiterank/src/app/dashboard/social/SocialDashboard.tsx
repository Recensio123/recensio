'use client'
import { useState } from 'react'
import { FacebookTab } from './FacebookTab'
import { InstagramTab } from './InstagramTab'

export interface FacebookData {
  followers: number
  followersGrowth: number
  pageViews: number
  pageViewsChange: number
  reach: number
  reachChange: number
  engagedUsers: number
  engagedUsersChange: number
  rating: number
  reviewCount: number
  followerTrend: number[]
  // CTA actions — Meta page_call_phone_clicks / page_website_clicks / page_get_directions_clicks
  websiteClicks: number
  websiteClicksChange: number
  callClicks: number
  callClicksChange: number
  directionsClicks: number
  directionsClicksChange: number
  // Audience location — Meta page_fans_city
  audienceCities: Array<{ city: string; pct: number }>
  // When followers are online — Meta page_fans_online_per_day (hour breakdown)
  followersOnlineByHour: number[]
  recentPosts: Array<{
    text: string
    date: string
    reach: number
    reactions: number
    comments: number
    shares: number
  }>
  // Top posts by reach — Meta post_impressions_unique, 90-day window
  topPosts: Array<{
    text: string
    date: string
    reach: number
    reactions: number
    comments: number
    shares: number
  }>
}

export interface InstagramData {
  followers: number
  followersGrowth: number
  profileVisits: number
  profileVisitsChange: number
  reach: number
  reachChange: number
  avgEngagementRate: number
  impressions: number
  followerTrend: number[]
  // Audience location — Instagram follower_demographics city
  audienceCities: Array<{ city: string; pct: number }>
  // When followers are online — Instagram online_followers by hour
  followersOnlineByHour: number[]
  recentPosts: Array<{
    type: 'photo' | 'reel'
    caption: string
    date: string
    reach: number
    likes: number
    comments: number
    saves: number
  }>
  // Top posts by reach — Instagram media insights, 90-day window
  topPosts: Array<{
    type: 'photo' | 'reel'
    caption: string
    date: string
    reach: number
    likes: number
    comments: number
    saves: number
  }>
}

type SocialTab = 'facebook' | 'instagram'

const TABS: { id: SocialTab; label: string }[] = [
  { id: 'facebook',  label: 'Facebook'  },
  { id: 'instagram', label: 'Instagram' },
]

export function SocialDashboard({ facebook, instagram }: { facebook: FacebookData; instagram: InstagramData }) {
  const [tab, setTab] = useState<SocialTab>('facebook')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Social Media</h1>
          <p className="text-slate-400 text-sm mt-1">Last 30 days</p>
        </div>
        <span className="text-xs text-mustard bg-mustard/10 border border-mustard/20 px-3 py-1.5 rounded-full">
          Sample data
        </span>
      </div>

      {/* Tab bar */}
      <div className="border-b border-navy-700">
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-white border-mustard'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'facebook'  && <FacebookTab  data={facebook} />}
      {tab === 'instagram' && <InstagramTab data={instagram} />}
    </div>
  )
}
