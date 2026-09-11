import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession, clearPublisherSession } from '@/lib/auth'

export async function GET() {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, plan: true, createdAt: true },
  })

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PATCH(request: NextRequest) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { name } = await request.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Nome inválido' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: { id: true, name: true, email: true, plan: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE() {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    // Delete all blob assets first
    const publications = await db.publication.findMany({
      where: { userId },
      include: {
        versions: {
          include: { assets: true },
        },
      },
    })

    const { deleteFromBlob } = await import('@/lib/blob')
    for (const pub of publications) {
      for (const version of pub.versions) {
        for (const asset of version.assets) {
          try {
            await deleteFromBlob(asset.storageKey)
          } catch {
            // ignore blob deletion errors
          }
        }
      }
    }

    await db.user.delete({ where: { id: userId } })
    await clearPublisherSession()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Erro ao excluir conta' }, { status: 500 })
  }
}
