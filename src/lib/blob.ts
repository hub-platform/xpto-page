import { BlobServiceClient } from '@azure/storage-blob'

function getClient() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
  return BlobServiceClient.fromConnectionString(connStr)
}

export async function uploadToBlob(
  key: string,
  content: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const container = process.env.AZURE_STORAGE_PUBLIC_CONTAINER ?? 'assets'
  const env = process.env.AZURE_STORAGE_ENV ?? 'dev'
  const blobPath = `${env}/page/${key}`

  const client = getClient()
  const blobClient = client.getContainerClient(container).getBlockBlobClient(blobPath)

  const buffer = content instanceof ArrayBuffer ? Buffer.from(content) : content
  await blobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } })

  return `https://hubassets.blob.core.windows.net/${container}/${blobPath}`
}

export async function deleteFromBlob(url: string): Promise<void> {
  const container = process.env.AZURE_STORAGE_PUBLIC_CONTAINER ?? 'assets'
  // Extract blob name: everything after "/<container>/"
  const marker = `/${container}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const blobName = url.slice(idx + marker.length)

  const client = getClient()
  await client.getContainerClient(container).getBlockBlobClient(blobName).deleteIfExists()
}
