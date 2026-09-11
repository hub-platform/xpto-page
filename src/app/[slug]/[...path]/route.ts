import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isReservedSlug } from '@/lib/slug'
import { getViewerSession } from '@/lib/session'
import type { Asset } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; path: string[] } }
) {
  const { slug, path } = params

  if (isReservedSlug(slug)) return NextResponse.next()

  const filePath = path.join('/')

  const publication = await db.publication.findUnique({
    where: { slug },
    include: {
      currentVersion: {
        include: { assets: true }
      }
    }
  })

  if (!publication || !publication.currentVersion) {
    return new NextResponse('Não encontrado', { status: 404 })
  }

  if (publication.expiresAt && publication.expiresAt < new Date()) {
    return new NextResponse('Publicação expirada', { status: 410 })
  }

  if (publication.accessType === 'protected') {
    const session = await getViewerSession(publication.id)
    if (!session) {
      return new NextResponse('Acesso negado', { status: 403 })
    }
  }

  const assets = publication.currentVersion.assets as Asset[]
  const asset = assets.find((a) => a.filePath === filePath)
  if (!asset) {
    return new NextResponse('Arquivo não encontrado', { status: 404 })
  }

  const response = await fetch(asset.storageKey)
  const buffer = await response.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
  })
}
