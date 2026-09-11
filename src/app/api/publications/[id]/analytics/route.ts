import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession } from '@/lib/auth'

interface Params {
  params: { id: string }
}

interface AnalyticsEvent {
  id: string
  publicationId: string
  versionId: string | null
  viewerSessionId: string | null
  viewerEmail: string | null
  ipAddress: string
  countryCode: string | null
  userAgent: string
  assetPath: string
  eventType: string
  durationSeconds: number | null
  createdAt: Date
}

export async function GET(request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const publication = await db.publication.findUnique({ where: { id: params.id } })
    if (!publication || publication.userId !== userId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '7')
    const viewerFilter = searchParams.get('viewer')
    const fileFilter = searchParams.get('file')

    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000)

    const whereBase = {
      publicationId: params.id,
      createdAt: { gte: since },
      ...(viewerFilter && { viewerEmail: viewerFilter }),
      ...(fileFilter && { assetPath: fileFilter }),
    }

    const [events, totalViews, durationEvents] = await Promise.all([
      db.analyticsEvent.findMany({
        where: whereBase,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      db.analyticsEvent.count({
        where: { ...whereBase, eventType: 'page_view' },
      }),
      db.analyticsEvent.findMany({
        where: { ...whereBase, eventType: 'duration', durationSeconds: { not: null } },
        select: { durationSeconds: true },
      }),
    ])

    // Unique viewers
    const typedEvents = events as AnalyticsEvent[]
    const uniqueViewers = new Set(typedEvents.map((e) => e.viewerEmail || e.ipAddress)).size

    // Avg duration
    const durations = (durationEvents as { durationSeconds: number | null }[])
      .map((e) => e.durationSeconds)
      .filter((d): d is number => d !== null)
    const avgDuration = durations.length > 0
      ? durations.reduce((acc, d) => acc + d, 0) / durations.length
      : 0

    // Top country
    const countryCounts: Record<string, number> = {}
    for (const e of typedEvents) {
      if (e.countryCode) {
        countryCounts[e.countryCode] = (countryCounts[e.countryCode] || 0) + 1
      }
    }
    const topCountry = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null

    // Daily views
    const dailyMap: Record<string, number> = {}
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      dailyMap[key] = 0
    }
    for (const e of typedEvents) {
      if (e.eventType === 'page_view') {
        const key = new Date(e.createdAt).toISOString().slice(0, 10)
        if (key in dailyMap) dailyMap[key]++
      }
    }

    const daily_views = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))

    return NextResponse.json({
      total_views: totalViews,
      unique_viewers: uniqueViewers,
      avg_duration: avgDuration,
      top_country: topCountry,
      daily_views,
      events: typedEvents,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Erro ao buscar analytics' }, { status: 500 })
  }
}
