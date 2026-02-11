import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * Supabase client for browser/client-side. Singleton to avoid multiple instances.
 * Returns null when env vars are missing (avoids white screen; callers should show "إعداد غير مكتمل").
 */
export function createClient(): ReturnType<typeof createBrowserClient> | null {
  if (browserClient) return browserClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || !anonKey?.trim()) {
    return null
  }
  browserClient = createBrowserClient(url, anonKey)
  return browserClient
}
