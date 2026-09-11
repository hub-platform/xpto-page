'use client'

import { useState } from 'react'

interface Publication {
  id: string
  title: string
  description: string | null
  slug: string
  accessType: string
  showBranding: boolean
  expiresAt: Date | null
}

interface Props {
  publication: Publication
}

export default function EditDetailsForm({ publication }: Props) {
  const [title, setTitle] = useState(publication.title)
  const [description, setDescription] = useState(publication.description || '')
  const [slug, setSlug] = useState(publication.slug)
  const [accessType, setAccessType] = useState(publication.accessType)
  const [showBranding, setShowBranding] = useState(publication.showBranding)
  const [expiresAt, setExpiresAt] = useState(
    publication.expiresAt
      ? new Date(publication.expiresAt).toISOString().slice(0, 16)
      : ''
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/publications/${publication.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          slug,
          access_type: accessType,
          show_branding: showBranding,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
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

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-white">Detalhes</h2>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Título</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Descrição</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug</label>
        <input
          type="text"
          value={slug}
          onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Controle de acesso</label>
        <select
          value={accessType}
          onChange={e => setAccessType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="public">Público</option>
          <option value="unlisted">Link privado</option>
          <option value="protected">Protegido</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Expiração</label>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={e => setExpiresAt(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-gray-500 text-xs mt-1">Deixe em branco para não expirar</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowBranding(!showBranding)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showBranding ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            showBranding ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        <span className="text-sm text-gray-300">Mostrar barra &ldquo;Powered by Page&rdquo;</span>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {saved && <p className="text-green-400 text-sm">Salvo com sucesso!</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}
