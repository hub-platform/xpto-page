import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPublisherSession } from '@/lib/auth'
import { uploadToBlob } from '@/lib/blob'
import { extractZip, hasIndexHtml } from '@/lib/zip'

interface Params {
  params: { id: string }
}

export async function POST(request: NextRequest, { params }: Params) {
  const userId = await getPublisherSession()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const publication = await db.publication.findUnique({
      where: { id: params.id },
      include: {
        versions: { select: { versionNumber: true }, orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    })

    if (!publication || publication.userId !== userId) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entryPoint = (formData.get('entry_point') as string) || 'index.html'

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 50MB)' }, { status: 400 })
    }

    const isHtml = file.name.endsWith('.html')
    const isZip = file.name.endsWith('.zip')

    if (!isHtml && !isZip) {
      return NextResponse.json({ error: 'Apenas arquivos .html e .zip são aceitos' }, { status: 400 })
    }

    const nextVersionNumber = (publication.versions[0]?.versionNumber ?? 0) + 1
    const storagePrefix = `pubs/${params.id}/v${nextVersionNumber}`

    const version = await db.publicationVersion.create({
      data: {
        publicationId: params.id,
        versionNumber: nextVersionNumber,
        entryPointPath: isZip ? entryPoint : 'index.html',
        storagePrefix,
      },
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    const assetsToCreate: {
      versionId: string
      filePath: string
      storageKey: string
      mimeType: string
      fileSize: number
    }[] = []

    if (isHtml) {
      const key = `${storagePrefix}/index.html`
      const url = await uploadToBlob(key, buffer, 'text/html')
      assetsToCreate.push({
        versionId: version.id,
        filePath: 'index.html',
        storageKey: url,
        mimeType: 'text/html',
        fileSize: buffer.length,
      })
    } else {
      // ZIP
      const entries = extractZip(buffer)

      if (!hasIndexHtml(entries) && !entries.some(e => e.filePath === entryPoint)) {
        return NextResponse.json(
          { error: `Arquivo ${entryPoint} não encontrado no ZIP` },
          { status: 400 }
        )
      }

      for (const entry of entries) {
        const key = `${storagePrefix}/${entry.filePath}`
        const url = await uploadToBlob(key, entry.content, entry.mimeType)
        assetsToCreate.push({
          versionId: version.id,
          filePath: entry.filePath,
          storageKey: url,
          mimeType: entry.mimeType,
          fileSize: entry.content.length,
        })
      }
    }

    await db.publicationAsset.createMany({ data: assetsToCreate })

    // Update current version
    await db.publication.update({
      where: { id: params.id },
      data: { currentVersionId: version.id },
    })

    const versionWithAssets = await db.publicationVersion.findUnique({
      where: { id: version.id },
      include: { assets: true },
    })

    return NextResponse.json(versionWithAssets, { status: 201 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}
