'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  plan: string
}

interface Props {
  user: User
}

export default function AccountForm({ user }: Props) {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao salvar')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmed = window.prompt('Digite sua confirmação. Para confirmar, escreva: EXCLUIR')
    if (confirmed !== 'EXCLUIR') return
    setDeleting(true)
    try {
      const res = await fetch('/api/auth/me', { method: 'DELETE' })
      if (res.ok) {
        router.push('/login')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-white mb-6">Informações da conta</h2>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">E-mail</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Plano</label>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.plan === 'pro' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-800 text-gray-400'
              }`}>
                {user.plan === 'pro' ? 'Pro' : 'Gratuito'}
              </span>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {saved && <p className="text-green-400 text-sm">Salvo com sucesso!</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-red-400 mb-2">Zona de perigo</h2>
        <p className="text-gray-400 text-sm mb-6">
          Ao excluir sua conta, todas as suas publicações e dados serão permanentemente deletados. Esta ação não pode ser desfeita.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-900 hover:bg-red-800 disabled:opacity-50 text-red-300 font-medium px-6 py-2.5 rounded-lg transition-colors text-sm"
        >
          {deleting ? 'Excluindo...' : 'Excluir minha conta'}
        </button>
      </div>
    </div>
  )
}
