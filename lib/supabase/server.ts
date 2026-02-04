import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { parse } from 'cookie'

/**
 * Supabase admin client (service role). Use only on the server for actions like updating user password.
 * Requires SUPABASE_SERVICE_ROLE_KEY. Never expose this client or the key to the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return null
  }
  return createSupabaseJsClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/**
 * Supabase client for server-side auth actions that do not need request cookies (e.g. signUp in register route).
 * Uses plain supabase-js client so signUp works reliably from API routes.
 */
export function createClientForAuthActions() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createSupabaseJsClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

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
