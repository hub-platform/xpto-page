import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOTP, hashOTP } from '@/lib/otp'
import { sendViewerCode } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, publicationId } = await request.json()

    if (!email || !publicationId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const publication = await db.publication.findUnique({
      where: { id: publicationId },
      select: { id: true, title: true, accessType: true },
    })

    if (!publication) {
      return NextResponse.json({ error: 'Publicação não encontrada' }, { status: 404 })
    }

    // Check if viewer is allowed
    const viewer = await db.publicationViewer.findFirst({
      where: { publicationId, email: normalizedEmail },
    })

    if (!viewer) {
      return NextResponse.json({ allowed: false })
    }

    // Generate OTP
    const otp = generateOTP()
    const hash = await hashOTP(otp)

    await db.authCode.create({
      data: {
        type: 'viewer',
        email: normalizedEmail,
        publicationId,
        codeHash: hash,
      },
    })

    await sendViewerCode(normalizedEmail, otp, publication.title)

    return NextResponse.json({ sent: true })
  } catch (error) {
    console.error('Viewer send error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
