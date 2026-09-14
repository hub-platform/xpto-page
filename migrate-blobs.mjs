import { BlobServiceClient } from '@azure/storage-blob'
import pg from 'pg'

const { Client } = pg

const DB_URL = process.env.SUPABASE_DIRECT_URL
const CONN_STR = process.env.AZURE_BLOB_CONNECTION_STRING ?? process.env.AZURE_STORAGE_CONNECTION_STRING
const CONTAINER = process.env.AZURE_STORAGE_PUBLIC_CONTAINER ?? 'assets'
const ENV = process.env.AZURE_STORAGE_ENV ?? 'prod'
const AZURE_BASE = `https://hubassets.blob.core.windows.net/${CONTAINER}`

if (!DB_URL) throw new Error('SUPABASE_DIRECT_URL not set')
if (!CONN_STR) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set')

const blobService = BlobServiceClient.fromConnectionString(CONN_STR)
const containerClient = blobService.getContainerClient(CONTAINER)

function vercelPathToAzureKey(vercelUrl) {
  // https://xxx.public.blob.vercel-storage.com/pubs/{pubId}/{n}/{file}
  // → pubs/{pubId}/v{n}/{file}
  const url = new URL(vercelUrl)
  const parts = url.pathname.slice(1).split('/')
  // parts: ['pubs', pubId, version, ...rest]
  if (parts[0] !== 'pubs') return null
  const [, pubId, version, ...rest] = parts
  return `pubs/${pubId}/v${version}/${rest.join('/')}`
}

function detectContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase()
  const map = {
    html: 'text/html; charset=utf-8',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    webp: 'image/webp',
  }
  return map[ext] ?? 'application/octet-stream'
}

async function uploadToAzure(azureKey, buffer, contentType) {
  const blobPath = `${ENV}/page/${azureKey}`
  const blobClient = containerClient.getBlockBlobClient(blobPath)
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
  return `${AZURE_BASE}/${ENV}/page/${azureKey}`
}

async function main() {
  const db = new Client({ connectionString: DB_URL })
  await db.connect()

  const { rows } = await db.query(
    `SELECT DISTINCT storage_key FROM publisher.publication_assets WHERE storage_key LIKE '%vercel%' ORDER BY storage_key`
  )

  console.log(`Found ${rows.length} Vercel assets to migrate`)

  const mapping = []

  for (const { storage_key } of rows) {
    const azureKey = vercelPathToAzureKey(storage_key)
    if (!azureKey) {
      console.warn(`  SKIP: cannot parse path from ${storage_key}`)
      continue
    }

    const contentType = detectContentType(storage_key)
    const azureUrl = `${AZURE_BASE}/${ENV}/page/${azureKey}`

    console.log(`\nMigrating: ${storage_key}`)
    console.log(`  → ${azureUrl}`)

    try {
      const res = await fetch(storage_key)
      if (!res.ok) {
        console.error(`  ERROR: HTTP ${res.status} downloading ${storage_key}`)
        continue
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      const actualContentType = res.headers.get('content-type') ?? contentType
      const finalUrl = await uploadToAzure(azureKey, buffer, actualContentType)
      console.log(`  ✓ Uploaded (${buffer.length} bytes, ${actualContentType})`)
      mapping.push({ old: storage_key, new: finalUrl })
    } catch (err) {
      console.error(`  ERROR: ${err.message}`)
    }
  }

  console.log(`\n\nMigrated ${mapping.length}/${rows.length} assets. Updating DB...`)

  for (const { old: oldUrl, new: newUrl } of mapping) {
    const result = await db.query(
      `UPDATE publisher.publication_assets SET storage_key = $1 WHERE storage_key = $2`,
      [newUrl, oldUrl]
    )
    console.log(`  Updated ${result.rowCount} row(s): ${oldUrl.slice(-40)} → ${newUrl.slice(-40)}`)
  }

  const { rows: remaining } = await db.query(
    `SELECT COUNT(*) FROM publisher.publication_assets WHERE storage_key LIKE '%vercel%'`
  )
  console.log(`\nRemaining Vercel assets: ${remaining[0].count}`)

  console.log('\nMapping (old → new):')
  for (const { old: o, new: n } of mapping) {
    console.log(`  ${o}`)
    console.log(`  → ${n}`)
  }

  await db.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
