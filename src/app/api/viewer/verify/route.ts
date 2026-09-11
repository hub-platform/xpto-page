import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyOTP } from '@/lib/otp'
import { createViewerSession } from '@/lib/session'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, publicationId, code } = await request.json()

    if (!email || !publicationId || !code) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const authCode = await db.authCode.findFirst({
      where: {
        type: 'viewer',
        email: normalizedEmail,
        publicationId,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!authCode) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 401 })
    }

    if (authCode.attempts >= 5) {
      return NextResponse.json({ error: 'Muitas tentativas. Solicite um novo código.' }, { status: 429 })
    }

    const valid = await verifyOTP(code, authCode.codeHash)

    if (!valid) {
      await db.authCode.update({
        where: { id: authCode.id },
        data: { attempts: { increment: 1 } },
      })
      return NextResponse.json({ error: 'Código incorreto' }, { status: 401 })
    }

    await db.authCode.update({
      where: { id: authCode.id },
      data: { used: true },
    })

    const sessionToken = await createViewerSession(publicationId, normalizedEmail)
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex')

    await db.viewerSession.create({
      data: {
        publicationId,
        viewerEmail: normalizedEmail,
        sessionTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Viewer verify error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
