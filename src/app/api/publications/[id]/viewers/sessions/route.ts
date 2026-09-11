import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession } from '@/lib/auth'

interface Params {
  params: { id: string }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const publication = await db.publication.findUnique({ where: { id: params.id } })
    if (!publication || publication.userId !== userId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await db.viewerSession.deleteMany({
      where: { publicationId: params.id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Revoke sessions error:', error)
    return NextResponse.json({ error: 'Erro ao revogar sessões' }, { status: 500 })
  }
}
