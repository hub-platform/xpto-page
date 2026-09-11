import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession } from '@/lib/auth'
import { isReservedSlug } from '@/lib/slug'

export async function GET() {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const publications = await db.publication.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      currentVersion: { select: { id: true, versionNumber: true } },
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

  return NextResponse.json(publications)
}

export async function POST(request: NextRequest) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { title, description, slug, access_type, viewers } = await request.json()

    if (!title || !slug) {
      return NextResponse.json({ error: 'Título e slug são obrigatórios' }, { status: 400 })
    }

    if (isReservedSlug(slug)) {
      return NextResponse.json({ error: 'Este slug é reservado' }, { status: 400 })
    }

    const existing = await db.publication.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 })
    }

    const publication = await db.publication.create({
      data: {
        userId,
        title,
        description: description || null,
        slug,
        accessType: access_type || 'public',
      },
    })

    // Add viewers if protected
    if (access_type === 'protected' && Array.isArray(viewers) && viewers.length > 0) {
      await db.publicationViewer.createMany({
        data: viewers.map((v: { email: string; name?: string }) => ({
          publicationId: publication.id,
          email: v.email.toLowerCase().trim(),
          name: v.name || null,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json(publication, { status: 201 })
  } catch (error) {
    console.error('Create publication error:', error)
    return NextResponse.json({ error: 'Erro ao criar publicação' }, { status: 500 })
  }
}
