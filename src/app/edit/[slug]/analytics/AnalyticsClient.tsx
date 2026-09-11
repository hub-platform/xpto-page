'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AnalyticsData {
  total_views: number
  unique_viewers: number
  avg_duration: number
  top_country: string | null
  daily_views: Array<{ date: string; count: number }>
  events: Array<{
    id: string
    createdAt: string
    viewerEmail: string | null
    ipAddress: string
    countryCode: string | null
    assetPath: string
    eventType: string
    durationSeconds: number | null
  }>
}

interface Props {
  publicationId: string
  slug: string
  title: string
  period: 7 | 30 | 90
}

export default function AnalyticsClient({ publicationId, slug, title, period: initialPeriod }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<7 | 30 | 90>(initialPeriod)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/publications/${publicationId}/analytics?period=${period}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [publicationId, period])

  const maxDailyViews = data?.daily_views ? Math.max(...data.daily_views.map(d => d.count), 1) : 1

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href={`/edit/${slug}`} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Voltar
          </a>
          <h1 className="text-white font-semibold flex-1 truncate">{title} — Analytics</h1>
          <div className="flex gap-2">
            {([7, 30, 90] as const).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); router.push(`/edit/${slug}/analytics?period=${p}`) }}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="text-gray-400 text-center py-20">Carregando analytics...</div>
        ) : !data ? (
          <div className="text-gray-400 text-center py-20">Erro ao carregar dados</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Visualizações', value: data.total_views },
                { label: 'Viewers únicos', value: data.unique_viewers },
                { label: 'Duração média', value: data.avg_duration ? `${Math.round(data.avg_duration)}s` : '—' },
                { label: 'País top', value: data.top_country || '—' },
              ].map(m => (
                <div key={m.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <p className="text-gray-400 text-sm">{m.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{m.value}</p>
                </div>
              ))}
            </div>

            {data.daily_views.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Visualizações por dia</h2>
                <div className="flex items-end gap-1 h-32">
                  {data.daily_views.map(d => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full bg-blue-600 rounded-t transition-all group-hover:bg-blue-500 relative"
                        style={{ height: `${(d.count / maxDailyViews) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                        title={`${d.date}: ${d.count} visualizações`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{data.daily_views[0]?.date}</span>
                  <span>{data.daily_views[data.daily_views.length - 1]?.date}</span>
                </div>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Eventos recentes</h2>
              {data.events.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum evento registrado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-800">
                        <th className="text-left pb-3 font-medium">Data</th>
                        <th className="text-left pb-3 font-medium">Tipo</th>
                        <th className="text-left pb-3 font-medium">Viewer</th>
                        <th className="text-left pb-3 font-medium">País</th>
                        <th className="text-left pb-3 font-medium">Arquivo</th>
                        <th className="text-left pb-3 font-medium">Duração</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.events.slice(0, 50).map(event => (
                        <tr key={event.id}>
                          <td className="py-3 text-gray-400 whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              event.eventType === 'page_view' ? 'bg-blue-900 text-blue-300' : 'bg-gray-800 text-gray-400'
                            }`}>
                              {event.eventType === 'page_view' ? 'Visualização' : event.eventType}
                            </span>
                          </td>
                          <td className="py-3 text-gray-300">{event.viewerEmail || event.ipAddress}</td>
                          <td className="py-3 text-gray-400">{event.countryCode || '—'}</td>
                          <td className="py-3 text-gray-400 max-w-32 truncate">{event.assetPath}</td>
                          <td className="py-3 text-gray-400">{event.durationSeconds ? `${event.durationSeconds}s` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
