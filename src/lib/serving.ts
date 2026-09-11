import { db } from './db'
export { generateSlug, isReservedSlug } from './slug'

export async function getPublicationBySlug(slug: string) {
  return db.publication.findUnique({
    where: { slug },
    include: {
      currentVersion: {
        include: { assets: true }
      }
    }
  })
}
