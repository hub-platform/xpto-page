import { redirect, notFound } from 'next/navigation'
import { getPublisherSession } from '@/lib/auth'
import { db } from '@/lib/db'
import AccessClient from './AccessClient'

interface Props {
  params: { slug: string }
}

export default async function AccessPage({ params }: Props) {
  const userId = await getPublisherSession()
  if (!userId) redirect('/login')

  const publication = await db.publication.findUnique({
    where: { slug: params.slug },
    include: {
      viewers: {
        orderBy: { addedAt: 'desc' },
      },
      viewerSessions: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { lastUsedAt: 'desc' },
      },
    },
  })

  if (!publication || publication.userId !== userId) notFound()

  return (
    <AccessClient
      publication={publication}
      slug={params.slug}
      viewers={publication.viewers}
      viewerSessions={publication.viewerSessions}
    />
  )
}
