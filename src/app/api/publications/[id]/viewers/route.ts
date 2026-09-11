import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession } from '@/lib/auth'

interface Params {
  params: { id: string }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const publication = await db.publication.findUnique({ where: { id: params.id } })
  if (!publication || publication.userId !== userId) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const viewers = await db.publicationViewer.findMany({
    where: { publicationId: params.id },
    orderBy: { addedAt: 'desc' },
  })

  return NextResponse.json(viewers)
}

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const publication = await db.publication.findUnique({ where: { id: params.id } })
    if (!publication || publication.userId !== userId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const { viewers } = await request.json()
    if (!Array.isArray(viewers) || viewers.length === 0) {
      return NextResponse.json({ error: 'Lista de viewers inválida' }, { status: 400 })
    }

    // Upsert viewers
    for (const v of viewers) {
      if (!v.email) continue
      const email = v.email.toLowerCase().trim()
      const existing = await db.publicationViewer.findFirst({
        where: { publicationId: params.id, email },
      })
      if (!existing) {
        await db.publicationViewer.create({
          data: {
            publicationId: params.id,
            email,
            name: v.name || null,
          },
        })
      }
    }

    const updated = await db.publicationViewer.findMany({
      where: { publicationId: params.id },
      orderBy: { addedAt: 'desc' },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Add viewers error:', error)
    return NextResponse.json({ error: 'Erro ao adicionar viewers' }, { status: 500 })
  }
}
