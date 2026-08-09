// Known AI referrer domains — used to classify GA4 referral traffic into the Gen AI channel.
// The GA4 sync route checks each incoming_source against this list and re-tags matching rows.
export const GEN_AI_DOMAINS = new Set([
  'chat.openai.com', 'chatgpt.com',
  'perplexity.ai',
  'claude.ai',
  'gemini.google.com', 'bard.google.com',
  'copilot.microsoft.com',
  'you.com',
  'meta.ai',
  'mistral.ai',
  'phind.com',
  'poe.com',
  'character.ai',
])

// Typical channel split for local service businesses (plumbers, electricians, cleaners etc.)
// Used as a reference benchmark in the Traffic mix visualisation.
export const SERVICE_BENCHMARKS: Record<string, number> = {
  'Organic Search':  38,
  'Direct':          30,
  'Paid Search':     14,
  'Referral':         8,
  'Organic Social':   5,
  'Email':            3,
  'Gen AI':           1,
  'Display':          1,
  'Paid Social':      1,
}

export const DONUT_COLORS: Record<string, string> = {
  // GA4 default channel groups
  'Organic Search':    '#4ade80',
  'Direct':            '#60a5fa',
  'Referral':          '#c084fc',
  'Paid Search':       '#f0b429',
  'Organic Social':    '#f472b6',
  'Social':            '#f472b6',
  'Paid Social':       '#fb7185',
  'Email':             '#38bdf8',
  'Affiliates':        '#fb923c',
  'Display':           '#818cf8',
  'Organic Video':     '#34d399',
  'Video':             '#34d399',
  'Organic Shopping':  '#a78bfa',
  'Paid Shopping':     '#fbbf24',
  'Cross-network':     '#e879f9',
  'SMS':               '#67e8f9',
  'Audio':             '#94a3b8',
  'Gen AI':            '#a78bfa',
  'Unassigned':        '#475569',
  // Devices
  'Mobile':            '#60a5fa',
  'Desktop':           '#1d4ed8',
  'Tablet':            '#bfdbfe',
  // Traffic type (legacy)
  'Organic':           '#4ade80',
  'Paid':              '#f0b429',
  'Other':             '#94a3b8',
}

export const DONUT_PALETTE = ['#4ade80','#60a5fa','#c084fc','#f0b429','#f472b6','#fb923c','#34d399','#a78bfa']

export const CHANNEL_COLORS: Record<string, { bar: string; dot: string }> = {
  'Organic Search':   { bar: 'bg-green-400',   dot: 'bg-green-400'   },
  'Direct':           { bar: 'bg-blue-400',    dot: 'bg-blue-400'    },
  'Referral':         { bar: 'bg-purple-400',  dot: 'bg-purple-400'  },
  'Paid Search':      { bar: 'bg-mustard',     dot: 'bg-mustard'     },
  'Organic Social':   { bar: 'bg-pink-400',    dot: 'bg-pink-400'    },
  'Social':           { bar: 'bg-pink-400',    dot: 'bg-pink-400'    },
  'Paid Social':      { bar: 'bg-rose-400',    dot: 'bg-rose-400'    },
  'Email':            { bar: 'bg-sky-400',     dot: 'bg-sky-400'     },
  'Affiliates':       { bar: 'bg-orange-400',  dot: 'bg-orange-400'  },
  'Display':          { bar: 'bg-indigo-400',  dot: 'bg-indigo-400'  },
  'Organic Video':    { bar: 'bg-emerald-400', dot: 'bg-emerald-400' },
  'Video':            { bar: 'bg-emerald-400', dot: 'bg-emerald-400' },
  'Organic Shopping': { bar: 'bg-violet-400',  dot: 'bg-violet-400'  },
  'Paid Shopping':    { bar: 'bg-amber-400',   dot: 'bg-amber-400'   },
  'Cross-network':    { bar: 'bg-fuchsia-400', dot: 'bg-fuchsia-400' },
  'SMS':              { bar: 'bg-cyan-400',    dot: 'bg-cyan-400'    },
  'Audio':            { bar: 'bg-slate-400',   dot: 'bg-slate-400'   },
  'Gen AI':           { bar: 'bg-violet-400',  dot: 'bg-violet-400'  },
  'Unassigned':       { bar: 'bg-slate-600',   dot: 'bg-slate-600'   },
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Organic Search': 'text-blue-400 bg-blue-500/10',
  'Paid Search':    'text-mustard bg-mustard/10',
  'Direct':         'text-slate-400 bg-navy-700',
  'Community':      'text-orange-400 bg-orange-500/10',
  'Review Site':    'text-green-400 bg-green-500/10',
  'Directory':      'text-purple-400 bg-purple-500/10',
  'Social Media':   'text-pink-400 bg-pink-500/10',
  'Email':          'text-sky-400 bg-sky-500/10',
  'Display Ads':    'text-indigo-400 bg-indigo-500/10',
  'Affiliate':      'text-rose-400 bg-rose-500/10',
  'Referral':       'text-slate-400 bg-navy-700',
  'Other':          'text-slate-500 bg-navy-700',
}

export const CHANNEL_TOOLTIPS: Record<string, string> = {
  'Organic Search':   'People who found you by typing something into Google or another search engine and clicking your result — no ad involved.',
  'Direct':           'People who typed your website address directly into their browser, or had it saved as a bookmark. This also includes visits from Facebook, Instagram, and TikTok — when someone opens a link inside those apps, Google cannot tell where they came from and puts them here instead.',
  'Referral':         'People who clicked a link to your website on another website — like a review platform, a business directory, or a partner site.',
  'Paid Search':      'People who clicked one of your paid ads on Google or Bing. Brings visitors straight away, but stops the moment you stop paying.',
  'Organic Social':   'People who came from a social media post, share, or comment — without you paying to show it to them. This number is often lower than reality because visits from inside the Facebook or Instagram app get counted as Direct instead.',
  'Social':           'People who came from social media. This number is often lower than the real amount — visits from inside the Facebook or Instagram app get counted as Direct instead because those apps hide where the visitor came from.',
  'Paid Social':      'People who clicked a paid ad on a social media platform like Facebook, Instagram, or LinkedIn.',
  'Email':            'People who clicked a link in one of your emails — for example a newsletter, a follow-up message, or a booking confirmation.',
  'Affiliates':       'People sent by a partner website that earns a fee for every visitor or sale they send you.',
  'Display':          'People who clicked a banner or image ad shown on another website — typically part of Google Display Network or a remarketing campaign.',
  'Organic Video':    'People who came from a video platform like YouTube without you paying for the placement — for example they watched one of your videos and clicked through to your website.',
  'Video':            'People who came from a video platform like YouTube.',
  'Organic Shopping': 'People who clicked on a free product or service listing shown in Google Shopping results.',
  'Paid Shopping':    'People who clicked on a paid ad shown in Google Shopping results.',
  'Cross-network':    'Visits driven by Google Performance Max or Demand Gen campaigns, which run across Search, Display, YouTube, and Gmail all at once.',
  'SMS':              'People who clicked a link in a text message you sent them.',
  'Audio':            'People who came from an audio ad — for example a podcast sponsorship or a Spotify ad.',
  'Gen AI':           'People who clicked a link to your website from an AI assistant — ChatGPT, Perplexity, Gemini, or similar tools. This traffic is classified from referral data by matching known AI domains. It is typically highly intentional: the person asked an AI for a recommendation and your business came up.',
  'Unassigned':       'Visits that Google could not match to any known channel. This usually means the tracking is incomplete or the traffic came from an unusual source.',
  'Social Media':     'People who came from social media. This number is often lower than the real amount — visits from inside the Facebook or Instagram app get counted as Direct instead because those apps hide where the visitor came from.',
  'Display Ads':      'People who clicked a banner or image ad shown on another website.',
  'Affiliate':        'People sent by a partner website that gets a fee for every visitor they send you.',
  'Other':            'Visits that Google could not match to any of the other categories.',
}

export const CATEGORY_TOOLTIPS: Record<string, string> = {
  'Organic Search': 'Came from typing something into Google or another search engine — no ad involved.',
  'Paid Search':    'Clicked one of your paid ads on Google.',
  'Direct':         'Typed your website address directly, used a bookmark, or came from a source Google could not identify — including some social media visits.',
  'Social Media':   'Came from a social media platform like LinkedIn or Pinterest. Visits from inside the Facebook or Instagram app usually show up as Direct instead — those apps hide where the visitor came from.',
  'Review Site':    'Came from a review website like Trustpilot. The more reviews you have there, the more visible your listing becomes — which sends even more visitors your way.',
  'Directory':      'Came from an online business directory like Hitta.se or Eniro.se, where people search for local services.',
  'Community':      'Came from a discussion or forum site like Reddit or Flashback.',
  'Email':          'Clicked a link in one of your emails.',
  'Display Ads':    'Clicked a banner or image ad shown on another website.',
  'Affiliate':      'Came from a partner website that gets a fee for every visitor they send you.',
  'Referral':       'Came from another website that linked to yours, not covered by the other categories.',
  'Other':          'Visits that Google could not match to any of the other categories.',
}
