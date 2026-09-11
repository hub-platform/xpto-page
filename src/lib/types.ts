// Type helpers for Prisma models since the generated client uses @ts-nocheck internally

export interface Asset {
  id: string
  versionId: string
  filePath: string
  storageKey: string
  mimeType: string
  fileSize: number
  createdAt: Date
}

export interface PublicationVersion {
  id: string
  publicationId: string
  versionNumber: number
  entryPointPath: string
  storagePrefix: string
  createdAt: Date
  assets: Asset[]
}
