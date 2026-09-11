import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOTP, hashOTP } from '@/lib/otp'
import { sendPublisherCode } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // If name provided → register flow
    if (name) {
      // Check if already exists
      const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
      if (existing) {
        return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
      }

      // Create user
      await db.user.create({
        data: { email: normalizedEmail, name: name.trim() },
      })

      const otp = generateOTP()
      const hash = await hashOTP(otp)
      await db.authCode.create({
        data: {
          type: 'publisher',
          email: normalizedEmail,
          codeHash: hash,
        },
      })

      await sendPublisherCode(normalizedEmail, otp, true)
      return NextResponse.json({ sent: true })
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return NextResponse.json({ exists: false })
    }

    // Rate limit: max 3 active codes in last hour
    const recentCodes = await db.authCode.count({
      where: {
        type: 'publisher',
        email: normalizedEmail,
        used: false,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    })

    if (recentCodes >= 3) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde antes de solicitar outro código.' }, { status: 429 })
    }

    const otp = generateOTP()
    const hash = await hashOTP(otp)
    await db.authCode.create({
      data: {
        type: 'publisher',
        email: normalizedEmail,
        codeHash: hash,
      },
    })

    await sendPublisherCode(normalizedEmail, otp, false)
    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error('Auth send error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
