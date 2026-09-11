export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export const RESERVED_SLUGS = ['login', 'register', 'dashboard', 'new', 'account', 'settings', 'api', 'admin', 'edit', 'logout', 'callback', 'health', 'terms', 'privacy', '404', '500']

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase())
}
