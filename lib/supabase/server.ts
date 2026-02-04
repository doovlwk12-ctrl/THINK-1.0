import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { parse } from 'cookie'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ignore in Server Components
        }
      },
    },
  })
}

/**
 * Create Supabase server client from request cookies (for Route Handlers / API routes).
 * Ensures the same cookies sent by the client are read on the server.
 */
export function createClientFromRequest(request: NextRequest | Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  const cookieHeader = request.headers.get('cookie') ?? ''
  const parsed = parse(cookieHeader)
  const cookiesList = Object.entries(parsed).map(([name, value]) => ({
    name,
    value: value ?? '',
  }))
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookiesList
      },
      setAll() {
        // Route Handler: cannot set cookies from here; middleware handles refresh
      },
    },
  })
}
