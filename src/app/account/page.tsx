import { redirect } from 'next/navigation'
import { getPublisherSession } from '@/lib/auth'
import { db } from '@/lib/db'
import AccountForm from './AccountForm'

export default async function AccountPage() {
  const userId = await getPublisherSession()
  if (!userId) redirect('/login')

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Dashboard
          </a>
          <h1 className="text-white font-semibold">Minha conta</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AccountForm user={user} />
      </main>
    </div>
  )
}
