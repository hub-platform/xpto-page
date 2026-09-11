import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function createViewerSession(publicationId: string, email: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString('hex')
  const token = await new SignJWT({ sub: email, pid: publicationId, sid: sessionToken })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)

  cookies().set(`viewer_session_${publicationId}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return sessionToken
}

export async function getViewerSession(publicationId: string): Promise<{ email: string; sessionToken: string } | null> {
  const token = cookies().get(`viewer_session_${publicationId}`)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return { email: payload.sub as string, sessionToken: payload.sid as string }
  } catch {
    return null
  }
}
