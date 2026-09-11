import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Page — Publique com controle',
  description: 'Plataforma para publicar arquivos HTML com controle de acesso e analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  )
}
