import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyOTP } from '@/lib/otp'
import { createPublisherSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find most recent valid auth code
    const authCode = await db.authCode.findFirst({
      where: {
        type: 'publisher',
        email: normalizedEmail,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!authCode) {
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 401 })
    }

    if (authCode.attempts >= 5) {
      return NextResponse.json({ error: 'Muitas tentativas inválidas. Solicite um novo código.' }, { status: 429 })
    }

    const valid = await verifyOTP(code, authCode.codeHash)

    if (!valid) {
      await db.authCode.update({
        where: { id: authCode.id },
        data: { attempts: { increment: 1 } },
      })
      return NextResponse.json({ error: 'Código incorreto' }, { status: 401 })
    }

    // Mark as used
    await db.authCode.update({
      where: { id: authCode.id },
      data: { used: true },
    })

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    await createPublisherSession(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auth verify error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
