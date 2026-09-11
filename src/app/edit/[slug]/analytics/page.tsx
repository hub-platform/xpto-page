import { redirect, notFound } from 'next/navigation'
import { getPublisherSession } from '@/lib/auth'
import { db } from '@/lib/db'
import AnalyticsClient from './AnalyticsClient'

interface Props {
  params: { slug: string }
  searchParams: { period?: string }
}

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const userId = await getPublisherSession()
  if (!userId) redirect('/login')

  const publication = await db.publication.findUnique({
    where: { slug: params.slug },
    select: { id: true, title: true, userId: true },
  })

  if (!publication || publication.userId !== userId) notFound()

  const period = parseInt(searchParams.period || '7') as 7 | 30 | 90

  return <AnalyticsClient publicationId={publication.id} slug={params.slug} title={publication.title} period={period} />
}
