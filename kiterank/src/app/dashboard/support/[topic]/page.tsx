import { notFound } from 'next/navigation'
import { getTopic } from '../topics'
import { SupportTopicView } from '../SupportTopicView'

export default async function SupportTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>
}) {
  const { topic: topicId } = await params
  const topic = getTopic(topicId)
  if (!topic) notFound()

  return <SupportTopicView topic={topic} />
}
