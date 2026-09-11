'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/slug'

type Step = 1 | 2 | 3

export default function NewPublicationPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Step 1: Info
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  // Step 2: Upload
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Step 3: Access
  const [accessType, setAccessType] = useState('public')
  const [viewersText, setViewersText] = useState('')

  const [createdSlug, setCreatedSlug] = useState('')

  useEffect(() => {
    if (title) {
      const generated = generateSlug(title)
      setSlug(generated)
    }
  }, [title])

  useEffect(() => {
    if (!slug) { setSlugAvailable(null); return }
    const timer = setTimeout(async () => {
      setCheckingSlug(true)
      try {
        const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(slug)}`)
        const data = await res.json()
        setSlugAvailable(data.available)
      } catch {
        setSlugAvailable(null)
      } finally {
        setCheckingSlug(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [slug])

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

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      // Parse viewers
      const viewers = viewersText
        .split(/[\n,]/)
        .map(e => e.trim())
        .filter(e => e.includes('@'))
        .map(e => ({ email: e }))

      // Create publication
      const pubRes = await fetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          slug,
          access_type: accessType,
          viewers: accessType === 'protected' ? viewers : undefined,
        }),
      })
      if (!pubRes.ok) {
        const d = await pubRes.json()
        throw new Error(d.error || 'Erro ao criar publicação')
      }
      const pub = await pubRes.json()

      // Upload file
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await fetch(`/api/publications/${pub.id}/upload`, {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) {
          const d = await uploadRes.json()
          throw new Error(d.error || 'Erro ao fazer upload')
        }
      }

      setCreatedSlug(pub.slug)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar publicação')
    } finally {
      setLoading(false)
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://page.xptobeta.com'

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Publicação criada!</h2>
          <p className="text-gray-400 text-sm mb-6">Sua publicação está disponível em:</p>
          <div className="bg-gray-800 rounded-lg px-4 py-3 mb-6">
            <span className="text-blue-400 text-sm">{appUrl}/{createdSlug}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push(`/edit/${createdSlug}`)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Editar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white transition-colors">
            ← Voltar
          </button>
          <h1 className="text-white font-semibold">Nova publicação</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Steps */}
        <div className="flex items-center gap-4 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-500'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-sm ${step === s ? 'text-white' : 'text-gray-500'}`}>
                {s === 1 ? 'Informações' : s === 2 ? 'Upload' : 'Acesso'}
              </span>
              {s < 3 && <div className="w-8 h-px bg-gray-700" />}
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-white">Informações</h2>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Título *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Minha apresentação"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Descrição</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descrição opcional..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="text-gray-500 text-sm pl-4 pr-1 whitespace-nowrap">{appUrl}/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 bg-transparent px-2 py-2.5 text-white focus:outline-none text-sm"
                    />
                  </div>
                  <div className="w-24 text-xs text-center">
                    {checkingSlug ? <span className="text-gray-500">Verificando...</span>
                      : slugAvailable === true ? <span className="text-green-400">Disponível</span>
                      : slugAvailable === false ? <span className="text-red-400">Indisponível</span>
                      : null}
                  </div>
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={() => {
                  if (!title || !slug) { setError('Preencha o título e o slug'); return }
                  if (slugAvailable === false) { setError('Escolha um slug disponível'); return }
                  setError(''); setStep(2)
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Próximo
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-white">Upload do arquivo</h2>
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
              <div className="flex gap-3">
                <button
                  onClick={() => { setError(''); setStep(1) }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    if (!file) { setError('Selecione um arquivo'); return }
                    setError(''); setStep(3)
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-white">Controle de acesso</h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'public', label: 'Público', desc: 'Qualquer pessoa com o link pode acessar' },
                  { value: 'unlisted', label: 'Link privado', desc: 'Só quem tem o link pode acessar' },
                  { value: 'protected', label: 'Protegido', desc: 'Requer autenticação por e-mail' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAccessType(opt.value)}
                    className={`text-left p-4 rounded-xl border-2 transition-colors ${
                      accessType === opt.value ? 'border-blue-500 bg-blue-950' : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-white text-sm">{opt.label}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {accessType === 'protected' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    E-mails autorizados (um por linha ou separados por vírgula)
                  </label>
                  <textarea
                    value={viewersText}
                    onChange={e => setViewersText(e.target.value)}
                    placeholder="email@exemplo.com&#10;outro@exemplo.com"
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  />
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => { setError(''); setStep(2) }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  {loading ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
