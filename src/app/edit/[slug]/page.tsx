import { redirect, notFound } from 'next/navigation'
import { getPublisherSession } from '@/lib/auth'
import { db } from '@/lib/db'
import EditDetailsForm from './EditDetailsForm'

interface Props {
  params: { slug: string }
  searchParams: { tab?: string }
}

interface Version {
  id: string
  publicationId: string
  versionNumber: number
  entryPointPath: string
  storagePrefix: string
  createdAt: Date
  assets: { id: string; filePath: string; storageKey: string; mimeType: string; fileSize: number; createdAt: Date; versionId: string }[]
}

export default async function EditPage({ params, searchParams }: Props) {
  const userId = await getPublisherSession()
  if (!userId) redirect('/login')

  const publication = await db.publication.findUnique({
    where: { slug: params.slug },
    include: {
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: { assets: true },
      },
      currentVersion: true,
    },
  })

  if (!publication || publication.userId !== userId) notFound()

  const tab = searchParams.tab || 'detalhes'
  const versions = publication.versions as unknown as Version[]

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Dashboard
          </a>
          <h1 className="text-white font-semibold flex-1 truncate">{publication.title}</h1>
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL}/${publication.slug}`}
            target="_blank"
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Abrir →
          </a>
        </div>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { key: 'detalhes', label: 'Detalhes' },
              { key: 'versoes', label: 'Versões' },
            ].map(t => (
              <a
                key={t.key}
                href={`/edit/${params.slug}?tab=${t.key}`}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {t.label}
              </a>
            ))}
            <a
              href={`/edit/${params.slug}/access`}
              className="pb-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-300 transition-colors"
            >
              Acesso
            </a>
            <a
              href={`/edit/${params.slug}/analytics`}
              className="pb-3 text-sm font-medium border-b-2 border-transparent text-gray-400 hover:text-gray-300 transition-colors"
            >
              Analytics
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {tab === 'detalhes' && (
          <EditDetailsForm publication={publication} />
        )}

        {tab === 'versoes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Versões</h2>
              <a
                href={`/edit/${params.slug}/version`}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                + Nova versão
              </a>
            </div>
            {versions.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma versão ainda.</p>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">v{v.versionNumber}</span>
                        {publication.currentVersionId === v.id && (
                          <span className="bg-green-900 text-green-300 text-xs font-medium px-2 py-0.5 rounded-full">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-0.5">
                        {new Date(v.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{v.assets.length} arquivo{v.assets.length !== 1 ? 's' : ''}</p>
                    </div>
                    {publication.currentVersionId !== v.id && (
                      <RollbackButton publicationId={publication.id} versionId={v.id} slug={params.slug} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function RollbackButton({ publicationId, versionId, slug }: { publicationId: string; versionId: string; slug: string }) {
  async function rollback() {
    'use server'
    const { db: database } = await import('@/lib/db')
    const { getPublisherSession } = await import('@/lib/auth')
    const userId = await getPublisherSession()
    if (!userId) return
    await database.publication.update({
      where: { id: publicationId, userId },
      data: { currentVersionId: versionId },
    })
    const { revalidatePath } = await import('next/cache')
    revalidatePath(`/edit/${slug}`)
  }

  return (
    <form action={rollback}>
      <button
        type="submit"
        className="text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
      >
        Ativar
      </button>
    </form>
  )
}
