import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isReservedSlug } from '@/lib/slug'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const getid = searchParams.get('getid')

  if (!slug) {
    return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
  }

  if (isReservedSlug(slug)) {
    if (getid) return NextResponse.json({ available: false, id: null })
    return NextResponse.json({ available: false })
  }

  const existing = await db.publication.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (getid) {
    return NextResponse.json({
      available: !existing,
      id: existing?.id ?? null,
    })
  }

  return NextResponse.json({ available: !existing })
}
