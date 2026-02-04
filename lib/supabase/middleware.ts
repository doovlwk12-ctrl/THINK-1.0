/**
 * Edge-compatible Supabase auth for Next.js middleware.
 * Reads session from request cookies; refreshes tokens and writes to response cookies.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export type SupabaseMiddlewareResult = {
  response: NextResponse
  user: { id: string } | null
}

function getRequestCookies(request: NextRequest): { name: string; value: string }[] {
  const fromCookies = request.cookies.getAll()
  if (fromCookies?.length) return fromCookies
  const header = request.headers.get('cookie')
  if (!header) return []
  return header.split(';').map((part) => {
    const eq = part.trim().indexOf('=')
    if (eq === -1) return { name: part.trim(), value: '' }
    return {
      name: part.trim().slice(0, eq).trim(),
      value: part.trim().slice(eq + 1).trim(),
    }
  })
}

export async function getSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<SupabaseMiddlewareResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return { response, user: null }
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return getRequestCookies(request)
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...(options as Record<string, unknown>) }
          delete opts.name
          response.cookies.set(name, value, opts)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    response,
    user: user ? { id: user.id } : null,
  }
}
