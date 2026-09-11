'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Viewer {
  id: string
  email: string
  name: string | null
  addedAt: Date
}

interface ViewerSession {
  id: string
  viewerEmail: string
  lastUsedAt: Date | null
}

interface Publication {
  id: string
  accessType: string
}

interface Props {
  publication: Publication
  slug: string
  viewers: Viewer[]
  viewerSessions: ViewerSession[]
}

export default function AccessClient({ publication, slug, viewers: initialViewers, viewerSessions }: Props) {
  const router = useRouter()
  const [viewers, setViewers] = useState(initialViewers)
  const [newViewersText, setNewViewersText] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [revoking, setRevoking] = useState(false)

  async function addViewers(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError('')
    try {
      const emails = newViewersText
        .split(/[\n,]/)
        .map(e => e.trim())
        .filter(e => e.includes('@'))
        .map(e => ({ email: e }))

      if (emails.length === 0) {
        setError('Nenhum e-mail válido encontrado')
        return
      }

      const res = await fetch(`/api/publications/${publication.id}/viewers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewers: emails }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao adicionar')
      }
      setNewViewersText('')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar')
    } finally {
      setAdding(false)
    }
  }

  async function removeViewer(email: string) {
    if (!confirm(`Remover ${email}?`)) return
    try {
      const res = await fetch(`/api/publications/${publication.id}/viewers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setViewers(v => v.filter(vw => vw.email !== email))
      }
    } catch {
      // ignore
    }
  }

  async function revokeAllSessions() {
    if (!confirm('Revogar todas as sessões ativas?')) return
    setRevoking(true)
    try {
      await fetch(`/api/publications/${publication.id}/viewers/sessions`, {
        method: 'DELETE',
      })
      router.refresh()
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href={`/edit/${slug}`} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Voltar
          </a>
          <h1 className="text-white font-semibold">Controle de acesso</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {publication.accessType !== 'protected' && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
            <p className="text-yellow-300 text-sm">
              Esta publicação não está com acesso &ldquo;Protegido&rdquo;. Os viewers configurados aqui só serão relevantes se você mudar o tipo de acesso para Protegido.
            </p>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Viewers autorizados ({viewers.length})</h2>
            {viewerSessions.length > 0 && (
              <button
                onClick={revokeAllSessions}
                disabled={revoking}
                className="text-sm text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {revoking ? 'Revogando...' : `Revogar sessões (${viewerSessions.length})`}
              </button>
            )}
          </div>

          {viewers.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum viewer adicionado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left pb-3 font-medium">E-mail</th>
                    <th className="text-left pb-3 font-medium">Nome</th>
                    <th className="text-left pb-3 font-medium">Adicionado</th>
                    <th className="text-left pb-3 font-medium">Sessão ativa</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {viewers.map(viewer => {
                    const session = viewerSessions.find(s => s.viewerEmail === viewer.email)
                    return (
                      <tr key={viewer.id}>
                        <td className="py-3 text-white">{viewer.email}</td>
                        <td className="py-3 text-gray-400">{viewer.name || '-'}</td>
                        <td className="py-3 text-gray-400">
                          {new Date(viewer.addedAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3">
                          {session ? (
                            <span className="text-green-400 text-xs">
                              {session.lastUsedAt
                                ? new Date(session.lastUsedAt).toLocaleDateString('pt-BR')
                                : 'Ativa'}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">Nenhuma</span>
                          )}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => removeViewer(viewer.email)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Adicionar viewers</h2>
          <form onSubmit={addViewers} className="space-y-4">
            <textarea
              value={newViewersText}
              onChange={e => setNewViewersText(e.target.value)}
              placeholder="email@exemplo.com&#10;outro@exemplo.com"
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={adding || !newViewersText.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
            >
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
