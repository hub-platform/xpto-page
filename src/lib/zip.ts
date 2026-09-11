import AdmZip from 'adm-zip'

export interface ZipEntry {
  filePath: string
  content: Buffer
  mimeType: string
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    html: 'text/html',
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
  }
  return map[ext || ''] || 'application/octet-stream'
}

export function extractZip(buffer: Buffer): ZipEntry[] {
  const zip = new AdmZip(buffer)
  const entries: ZipEntry[] = []

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const filePath = entry.entryName
    const content = entry.getData()
    entries.push({ filePath, content, mimeType: getMimeType(filePath) })
  }

  return entries
}

export function hasIndexHtml(entries: ZipEntry[]): boolean {
  return entries.some(e => e.filePath === 'index.html')
}
