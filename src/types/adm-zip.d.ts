declare module 'adm-zip' {
  interface IZipEntry {
    entryName: string
    isDirectory: boolean
    getData(): Buffer
  }

  class AdmZip {
    constructor(input?: string | Buffer)
    getEntries(): IZipEntry[]
    getEntry(name: string): IZipEntry | null
    addFile(entryName: string, data: Buffer, comment?: string, attr?: number): void
    extractAllTo(targetPath: string, overwrite?: boolean): void
    toBuffer(): Buffer
  }

  export = AdmZip
}
