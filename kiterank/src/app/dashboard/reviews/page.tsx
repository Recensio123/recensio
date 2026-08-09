import { Tooltip } from '@/components/Tooltip'

const mockReviews = [
  { id: 1, author: 'Anna K.',   rating: 5, text: 'Excellent service, came within the hour. Very professional and fixed the issue quickly. Will definitely use again!', date: '2 days ago',  replied: false },
  { id: 2, author: 'Marcus L.', rating: 2, text: 'Took much longer than quoted and the price was higher than expected. Not happy with the communication.',             date: '5 days ago',  replied: false },
  { id: 3, author: 'Sara B.',   rating: 5, text: 'Really impressed. Clean work, explained everything clearly. Highly recommend.',                                        date: '1 week ago',  replied: false },
  { id: 4, author: 'Johan P.',  rating: 4, text: 'Good job overall, minor issue with scheduling but the actual work was great.',                                         date: '2 weeks ago', replied: true },
]

export default function ReviewsPage() {
  const unanswered = mockReviews.filter(r => !r.replied).length

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Reviews</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and respond to your Google reviews</p>
        </div>
        <Tooltip text="Reviews you have not replied to yet. Replying to all of them, including the negative ones, shows customers you care — and Google tends to reward businesses that do.">
          <div className="bg-mustard/10 border border-mustard/20 rounded-full px-3 py-1 cursor-default">
            <span className="text-mustard text-xs font-medium">{unanswered} unanswered</span>
          </div>
        </Tooltip>
      </div>

      <div className="space-y-3">
        {mockReviews.map(review => (
          <div key={review.id} className={`bg-navy-800 rounded-xl p-5 border ${review.replied ? 'border-navy-700' : 'border-mustard/20'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{review.author}</span>
                  <Tooltip text={`${review.rating} out of 5 stars. ${review.rating >= 4 ? 'A happy customer. A warm, genuine reply encourages others to leave reviews too.' : 'An unhappy customer. Reply calmly, acknowledge what went wrong, and offer to sort it out. Others reading this will see how you handle problems.'}`}>
                    <span className="text-mustard text-xs cursor-default">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </Tooltip>
                  <span className="text-slate-600 text-xs">{review.date}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{review.text}</p>
              </div>
              {review.replied && <span className="text-xs text-slate-600 shrink-0">Replied</span>}
            </div>

            {!review.replied && (
              <div className="mt-4 p-3 bg-navy-900 rounded-lg border border-navy-600">
                <Tooltip text="A suggested reply written for this specific review. Feel free to change anything before sending — adding something personal always makes it better.">
                  <p className="text-xs text-mustard mb-2 cursor-default">Suggested response</p>
                </Tooltip>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {review.rating >= 4
                    ? `Thank you so much for the kind words, ${review.author.split(' ')[0]}! We're really glad we could help and look forward to being your go-to plumber in the future.`
                    : `Hi ${review.author.split(' ')[0]}, thank you for taking the time to share your feedback. We're sorry to hear the experience didn't meet your expectations — we'd love to make it right. Please reach out to us directly so we can discuss.`
                  }
                </p>
                <div className="flex gap-3 mt-3">
                  <button className="text-xs bg-mustard hover:bg-mustard-light text-navy-950 font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Publish response
                  </button>
                  <button className="text-xs text-slate-400 hover:text-white transition-colors">
                    Edit first
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
