import { NextResponse } from 'next/server'
import { clearPublisherSession } from '@/lib/auth'

export async function POST() {
  await clearPublisherSession()
  return NextResponse.json({ ok: true })
}
