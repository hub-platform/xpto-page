import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, pid, asset, duration } = body

    if (!type || !pid || !asset) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
    const userAgent = request.headers.get('user-agent') || ''

    const publication = await db.publication.findUnique({
      where: { id: pid },
      select: { id: true, currentVersionId: true },
    })

    if (!publication) {
      return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 })
    }

    await db.analyticsEvent.create({
      data: {
        publicationId: pid,
        versionId: publication.currentVersionId || null,
        ipAddress: ip,
        userAgent,
        assetPath: asset,
        eventType: type,
        durationSeconds: type === 'duration' && duration ? parseInt(duration) : null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Analytics event error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
