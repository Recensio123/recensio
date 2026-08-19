import { AIVisibilityDashboard } from './AIVisibilityDashboard'
import { HiddenIn } from '@/components/dashboard/PlanGate'

const mockData = {
  totalPrompts: 5,

  results: [
    {
      prompt: 'best plumber in Stockholm',
      chatgpt: {
        mentioned: true,
        position:  3,
        snippet:   'For reliable plumbing in central Stockholm, Linus VVS is a solid choice — they cover emergency callouts quickly and have strong Google reviews across multiple neighbourhoods.',
      },
      perplexity: {
        mentioned: true,
        position:  2,
        snippet:   'Linus VVS stands out for emergency work in greater Stockholm, particularly noted for fast response in Kista, Solna, and Vasastan. Their Google Business Profile shows a 4.7-star average across 31 reviews.',
        citations: ['google.com/maps', 'trustpilot.com', 'reco.se'],
      },
      gemini: {
        mentioned: false,
        position:  null,
      },
      aiOverview: {
        mentioned: true,
        position:  4,
        snippet:   'Linus VVS · 4.7 ★ · Kista · Emergency plumbing · Fast response times',
        citations: ['google.com/maps'],
      },
    },
    {
      prompt: 'emergency plumber Stockholm',
      chatgpt: {
        mentioned: false,
        position:  null,
      },
      perplexity: {
        mentioned: true,
        position:  1,
        snippet:   'Linus VVS offers rapid-response callouts and is rated highly for availability outside normal hours.',
        citations: ['google.com/maps', 'yelp.com'],
      },
      gemini: {
        mentioned: false,
        position:  null,
      },
      aiOverview: {
        mentioned: false,
        position:  null,
      },
    },
    {
      prompt: 'recommended plumber Kista',
      chatgpt: {
        mentioned: true,
        position:  4,
        snippet:   'Linus VVS serves the Kista area and is mentioned positively for response speed and upfront pricing. Worth contacting if you need same-day availability.',
      },
      perplexity: {
        mentioned: false,
        position:  null,
      },
      gemini: {
        mentioned: false,
        position:  null,
      },
      aiOverview: {
        mentioned: false,
        position:  null,
      },
    },
    {
      prompt: 'vvs jour stockholm',
      chatgpt: {
        mentioned: false,
        position:  null,
      },
      perplexity: {
        mentioned: true,
        position:  3,
        snippet:   'For VVS emergency cover, Linus VVS is among the more responsive Stockholm providers based on recent review activity.',
        citations: ['google.com/maps', 'hitta.se'],
      },
      gemini: {
        mentioned: false,
        position:  null,
      },
      aiOverview: {
        mentioned: false,
        position:  null,
      },
    },
    {
      prompt: 'byta varmvattenberedare stockholm',
      chatgpt:    { mentioned: false, position: null },
      perplexity: { mentioned: false, position: null },
      gemini:     { mentioned: false, position: null },
      aiOverview: { mentioned: false, position: null },
    },
  ],

  competitors: [
    { name: 'Rörmokaren AB',   chatgpt: 4, perplexity: 5, gemini: 1, aiOverview: 3 },
    { name: 'VVS Jour 24',     chatgpt: 3, perplexity: 4, gemini: 0, aiOverview: 2 },
    { name: 'Kungsholmen VVS', chatgpt: 1, perplexity: 2, gemini: 0, aiOverview: 1 },
  ],

  weeklyTrend: [
    { week: '6 Apr',  chatgpt: 1, perplexity: 2, gemini: 0, aiOverview: 0 },
    { week: '13 Apr', chatgpt: 1, perplexity: 2, gemini: 0, aiOverview: 1 },
    { week: '20 Apr', chatgpt: 2, perplexity: 2, gemini: 0, aiOverview: 1 },
    { week: '27 Apr', chatgpt: 1, perplexity: 3, gemini: 0, aiOverview: 1 },
    { week: '4 May',  chatgpt: 2, perplexity: 3, gemini: 0, aiOverview: 1 },
    { week: '11 May', chatgpt: 2, perplexity: 3, gemini: 0, aiOverview: 1 },
    { week: '18 May', chatgpt: 2, perplexity: 3, gemini: 0, aiOverview: 1 },
    { week: '25 May', chatgpt: 2, perplexity: 3, gemini: 0, aiOverview: 1 },
  ],
}

export default function AIVisibilityPage() {
  return (
    /* Not part of the simplified track — the menu entry is gone in testbok2 and
       so is the page, for anyone who arrives by address or by back button. */
    <HiddenIn plans={['testbok2']}>
      <div className="px-4 sm:px-8 py-6 space-y-6">
        <AIVisibilityDashboard data={mockData} />
      </div>
    </HiddenIn>
  )
}
