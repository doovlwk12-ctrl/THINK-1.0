/**
 * Single source of truth for public (unauthenticated) paths.
 * Used by middleware to decide whether to require auth.
 */

const PUBLIC_PATH_PREFIXES = [
  '/engineer/apply/',
  '/api/engineer/applications/',
] as const

/** Page routes that do not require auth (middleware allows without redirect to login). */
const PUBLIC_PAGES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/forgot-email',
  '/reset-password',
] as const

const PUBLIC_API_EXACT = [
  '/api/auth/forgot-email',
  '/api/auth/register',
  '/api/packages',
  '/api/content/homepage',
] as const

export function isPublicPath(path: string): boolean {
  if (PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p))) return true
  if (PUBLIC_PAGES.includes(path as (typeof PUBLIC_PAGES)[number])) return true
  if (PUBLIC_API_EXACT.includes(path as (typeof PUBLIC_API_EXACT)[number])) return true
  return false
}

export const PUBLIC_ROUTES = {
  pages: [...PUBLIC_PAGES, '/engineer/apply/[token]'],
  api: [
    '/api/auth/register',
    '/api/auth/forgot-email',
    '/api/packages',
    '/api/content/homepage',
    '/api/engineer/applications/[token]',
  ],
} as const
