'use client'

import { useRouter } from 'next/navigation'
import PublicationCards from './PublicationCards'

interface User {
  id: string
  name: string
  email: string
  plan: string
}

interface Publication {
  id: string
  title: string
  slug: string
  accessType: string
  showBranding: boolean
  expiresAt: Date | null
  createdAt: Date
  currentVersion: { id: string; versionNumber: number } | null
  _count: { analyticsEvents: number }
}

interface Props {
  user: User
  publications: Publication[]
}

export default function DashboardClient({ user, publications }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-white">Page</h1>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <span className="text-white font-medium">Publicações</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/account')}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              {user.name}
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Suas publicações</h2>
            <p className="text-gray-400 text-sm mt-1">
              {publications.length === 0
                ? 'Nenhuma publicação ainda'
                : `${publications.length} publicação${publications.length !== 1 ? 'ões' : ''}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/new')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            + Nova publicação
          </button>
        </div>

        {publications.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-700 rounded-2xl">
            <p className="text-gray-500 text-lg mb-4">Nenhuma publicação ainda</p>
            <button
              onClick={() => router.push('/new')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Criar primeira publicação
            </button>
          </div>
        ) : (
          <PublicationCards publications={publications} />
        )}
      </main>
    </div>
  )
}
