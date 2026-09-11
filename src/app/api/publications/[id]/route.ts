import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession } from '@/lib/auth'
import { deleteFromBlob } from '@/lib/blob'
import { isReservedSlug } from '@/lib/slug'

interface Params {
  params: { id: string }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const publication = await db.publication.findUnique({
    where: { id: params.id },
    include: {
      currentVersion: {
        include: { assets: true },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
      viewers: {
        orderBy: { addedAt: 'desc' },
      },
    },
  })

  if (!publication || publication.userId !== userId) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  return NextResponse.json(publication)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { title, description, slug, access_type, expires_at, show_branding } = body

    if (slug && isReservedSlug(slug)) {
      return NextResponse.json({ error: 'Este slug é reservado' }, { status: 400 })
    }

    // Check slug uniqueness (excluding current publication)
    if (slug) {
      const existing = await db.publication.findFirst({
        where: { slug, id: { not: params.id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Slug já em uso' }, { status: 409 })
      }
    }

    const publication = await db.publication.update({
      where: { id: params.id, userId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(slug !== undefined && { slug }),
        ...(access_type !== undefined && { accessType: access_type }),
        ...(expires_at !== undefined && { expiresAt: expires_at ? new Date(expires_at) : null }),
        ...(show_branding !== undefined && { showBranding: show_branding }),
      },
    })

    return NextResponse.json(publication)
  } catch (error) {
    console.error('Update publication error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const publication = await db.publication.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          include: { assets: true },
        },
      },
    })

    if (!publication || publication.userId !== userId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    // Delete blob assets
    for (const version of publication.versions) {
      for (const asset of version.assets) {
        try {
          await deleteFromBlob(asset.storageKey)
        } catch {
          // ignore blob errors
        }
      }
    }

    await db.publication.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete publication error:', error)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
