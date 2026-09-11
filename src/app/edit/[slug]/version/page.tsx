'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function NewVersionPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.html') || f.name.endsWith('.zip'))) {
      setFile(f)
    } else {
      setError('Apenas arquivos .html e .zip são aceitos')
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      // Get publication id from slug
      const pubRes = await fetch(`/api/slug-check?slug=${encodeURIComponent(slug)}&getid=1`)
      const pubData = await pubRes.json()
      if (!pubData.id) throw new Error('Publicação não encontrada')

      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/publications/${pubData.id}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao fazer upload')
      }
      router.push(`/edit/${slug}?tab=versoes`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href={`/edit/${slug}?tab=versoes`} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Voltar
          </a>
          <h1 className="text-white font-semibold">Nova versão</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-white">Publicar nova versão</h2>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-blue-500 bg-blue-950' : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.zip"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-gray-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="text-red-400 text-sm mt-3 hover:text-red-300 transition-colors"
                >
                  Remover
                </button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3">📁</div>
                <p className="text-white font-medium">Arraste ou clique para selecionar</p>
                <p className="text-gray-400 text-sm mt-1">Arquivos .html ou .zip (máx. 50MB)</p>
              </>
            )}
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {uploading ? 'Publicando...' : 'Publicar nova versão'}
          </button>
        </div>
      </main>
    </div>
  )
}
