import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession } from '@/lib/auth'

interface Params {
  params: { id: string; email: string }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const publication = await db.publication.findUnique({ where: { id: params.id } })
    if (!publication || publication.userId !== userId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const email = decodeURIComponent(params.email).toLowerCase()

    // Delete viewer
    await db.publicationViewer.deleteMany({
      where: { publicationId: params.id, email },
    })

    // Revoke sessions
    await db.viewerSession.deleteMany({
      where: { publicationId: params.id, viewerEmail: email },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete viewer error:', error)
    return NextResponse.json({ error: 'Erro ao remover viewer' }, { status: 500 })
  }
}
