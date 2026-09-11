import { redirect } from 'next/navigation'
import { getPublisherSession } from '@/lib/auth'
import { db } from '@/lib/db'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const userId = await getPublisherSession()
  if (!userId) redirect('/login')

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/login')

  const publications = await db.publication.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      currentVersion: true,
      _count: {
        select: {
          analyticsEvents: {
            where: {
              eventType: 'page_view',
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
        },
      },
    },
  })

  return <DashboardClient user={user} publications={publications} />
}
