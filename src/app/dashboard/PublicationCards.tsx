'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  publications: Publication[]
}

const ACCESS_LABELS: Record<string, { label: string; color: string }> = {
  public: { label: 'Público', color: 'bg-green-900 text-green-300' },
  unlisted: { label: 'Link privado', color: 'bg-yellow-900 text-yellow-300' },
  protected: { label: 'Protegido', color: 'bg-red-900 text-red-300' },
}

export default function PublicationCards({ publications }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://page.xptobeta.com'

  async function copyUrl(slug: string) {
    const url = `${appUrl}/${slug}`
    await navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  async function deletePublication(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta publicação?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/publications/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeleting(null)
      setMenuOpen(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {publications.map(pub => {
        const access = ACCESS_LABELS[pub.accessType] || { label: pub.accessType, color: 'bg-gray-700 text-gray-300' }
        const initial = pub.title.charAt(0).toUpperCase()
        const url = `${appUrl}/${pub.slug}`

        return (
          <div key={pub.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4 relative">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${access.color}`}>
                    {access.label}
                  </span>
                  {!pub.currentVersion && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                      Sem versão
                    </span>
                  )}
                </div>
                <h3 className="text-white font-semibold text-sm truncate">{pub.title}</h3>
              </div>
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === pub.id ? null : pub.id)}
                  className="text-gray-500 hover:text-gray-300 p-1 transition-colors"
                >
                  •••
                </button>
                {menuOpen === pub.id && (
                  <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 min-w-40 py-1">
                    <button
                      onClick={() => { router.push(`/edit/${pub.slug}`); setMenuOpen(null) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { router.push(`/edit/${pub.slug}/analytics`); setMenuOpen(null) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      Analytics
                    </button>
                    <button
                      onClick={() => { window.open(url, '_blank'); setMenuOpen(null) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      Abrir
                    </button>
                    <hr className="border-gray-700 my-1" />
                    <button
                      onClick={() => deletePublication(pub.id)}
                      disabled={deleting === pub.id}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {deleting === pub.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-gray-400 text-xs truncate flex-1">{url}</span>
              <button
                onClick={() => copyUrl(pub.slug)}
                className="text-gray-400 hover:text-white text-xs transition-colors flex-shrink-0"
              >
                {copied === pub.slug ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <p className="text-gray-500 text-xs">
              {pub._count.analyticsEvents} visualização{pub._count.analyticsEvents !== 1 ? 'ões' : ''} nos últimos 7 dias
            </p>
          </div>
        )
      })}
    </div>
  )
}
