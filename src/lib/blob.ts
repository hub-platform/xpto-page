import { put, del } from '@vercel/blob'

export async function uploadToBlob(
  key: string,
  content: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const { url } = await put(key, content, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  })
  return url
}

export async function deleteFromBlob(url: string): Promise<void> {
  await del(url)
}
