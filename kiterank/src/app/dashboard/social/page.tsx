import { SocialDashboard } from './SocialDashboard'

const mockFacebook = {
  followers: 342, followersGrowth: 8,
  pageViews: 890, pageViewsChange: 12,
  reach: 2840, reachChange: -4,
  engagedUsers: 187, engagedUsersChange: 3,
  rating: 4.7, reviewCount: 31,
  followerTrend: [298, 308, 318, 324, 334, 342],
  websiteClicks: 47, websiteClicksChange: 8,
  callClicks: 23, callClicksChange: 12,
  directionsClicks: 11, directionsClicksChange: -3,
  audienceCities: [
    { city: 'Stockholm', pct: 71 },
    { city: 'Solna',     pct: 12 },
    { city: 'Nacka',     pct: 8  },
    { city: 'Lidingö',   pct: 5  },
    { city: 'Other',     pct: 4  },
  ],
  followersOnlineByHour: [8, 6, 4, 3, 5, 12, 28, 45, 62, 58, 52, 48, 51, 54, 58, 61, 67, 72, 68, 55, 44, 36, 24, 14],
  recentPosts: [
    { text: 'Snabb utryckning i Kista — läcka under diskbänken fixad på under en timme ⚡', date: '2026-05-24', reach: 412, reactions: 18, comments: 3, shares: 2 },
    { text: 'Tips: Vet du vad du ska göra om ett rör spricker? Spara vårt nummer 📞',        date: '2026-05-18', reach: 289, reactions: 12, comments: 7, shares: 14 },
    { text: 'Vi söker ny lärling! Skicka in din ansökan',                                   date: '2026-05-12', reach: 198, reactions: 24, comments: 11, shares: 3 },
    { text: 'Nyinstallation av varmvattenberedare i Bromma ✅',                             date: '2026-05-06', reach: 156, reactions: 9,  comments: 1,  shares: 0 },
    { text: 'Vanliga orsaker till ett droppande element',                                    date: '2026-04-28', reach: 334, reactions: 21, comments: 5,  shares: 8 },
  ],
  topPosts: [
    { text: 'Vi söker ny lärling! Skicka in din ansökan',                                   date: '2026-05-12', reach: 198,  reactions: 24, comments: 11, shares: 3  },
    { text: 'Så här ser en rörspolning ut — ingen trodde vi skulle klara det 💦',           date: '2026-04-11', reach: 1080, reactions: 67, comments: 22, shares: 41 },
    { text: 'Varför dricker vi kranvatten i Sverige? 3 fakta som förvånar',                 date: '2026-03-28', reach: 920,  reactions: 54, comments: 18, shares: 36 },
    { text: 'Vanliga orsaker till ett droppande element',                                    date: '2026-04-28', reach: 334,  reactions: 21, comments: 5,  shares: 8  },
    { text: 'Tidig morgon, nytt uppdrag i Vasastan 🔧',                                    date: '2026-03-14', reach: 287,  reactions: 31, comments: 9,  shares: 5  },
  ],
}

const mockInstagram = {
  followers: 178, followersGrowth: 12,
  profileVisits: 340, profileVisitsChange: 8,
  reach: 2100, reachChange: 6,
  avgEngagementRate: 4.2,
  impressions: 4800,
  followerTrend: [134, 148, 156, 162, 166, 178],
  audienceCities: [
    { city: 'Stockholm',  pct: 68 },
    { city: 'Gothenburg', pct: 9  },
    { city: 'Solna',      pct: 8  },
    { city: 'Malmö',      pct: 6  },
    { city: 'Other',      pct: 9  },
  ],
  followersOnlineByHour: [5, 4, 3, 2, 3, 8, 18, 38, 52, 48, 44, 42, 46, 50, 54, 58, 72, 82, 76, 62, 54, 46, 32, 18],
  recentPosts: [
    { type: 'photo' as const, caption: 'Snabb utryckning i Kista ⚡',                  date: '2026-05-24', reach: 520,  likes: 34, comments: 4,  saves: 12 },
    { type: 'reel'  as const, caption: 'Se hur vi fixar ett läckande rör 🔧',          date: '2026-05-19', reach: 890,  likes: 67, comments: 8,  saves: 23 },
    { type: 'photo' as const, caption: 'Nyinstallation klar i Bromma ✅',              date: '2026-05-13', reach: 310,  likes: 28, comments: 2,  saves: 5  },
    { type: 'photo' as const, caption: 'Tips: Så undviker du igensatta rör 💡',        date: '2026-05-07', reach: 440,  likes: 41, comments: 6,  saves: 18 },
    { type: 'reel'  as const, caption: 'Badrumrenovering på 60 sekunder 🛁',           date: '2026-04-30', reach: 1240, likes: 98, comments: 14, saves: 42 },
    { type: 'photo' as const, caption: 'Morgonen börjar tidigt för oss 🌅',            date: '2026-04-24', reach: 280,  likes: 22, comments: 1,  saves: 3  },
  ],
  topPosts: [
    { type: 'reel'  as const, caption: 'Badrumrenovering på 60 sekunder 🛁',           date: '2026-04-30', reach: 1240, likes: 98,  comments: 14, saves: 42 },
    { type: 'reel'  as const, caption: 'Så här spolar vi ett stopp på 3 minuter 💦',   date: '2026-04-08', reach: 980,  likes: 76,  comments: 11, saves: 34 },
    { type: 'photo' as const, caption: 'Nyinstallation klar i Bromma ✅',              date: '2026-05-13', reach: 310,  likes: 28,  comments: 2,  saves: 5  },
    { type: 'reel'  as const, caption: 'Se hur vi fixar ett läckande rör 🔧',          date: '2026-05-19', reach: 890,  likes: 67,  comments: 8,  saves: 23 },
    { type: 'photo' as const, caption: '3 saker som förstör dina rör på sikt 💡',      date: '2026-03-21', reach: 740,  likes: 58,  comments: 9,  saves: 29 },
  ],
}

export default function SocialPage() {
  return (
    <div className="px-8 py-6 space-y-6">
      <SocialDashboard facebook={mockFacebook} instagram={mockInstagram} />
    </div>
  )
}
