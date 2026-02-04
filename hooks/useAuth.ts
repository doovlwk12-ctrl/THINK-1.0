'use client'

import { useContext } from 'react'
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'
import { SupabaseAuthContext } from '@/components/providers/SupabaseAuthProvider'

export type AuthRole = 'CLIENT' | 'ENGINEER' | 'ADMIN'

export interface AuthSession {
  user: {
    id: string
    name: string | null
    email: string | null
    /** عند استخدام Supabase قد يكون undefined حتى يُحمّل من /api/auth/me */
    role?: AuthRole
  }
}

/**
 * Auth hook: returns session from Supabase (when NEXT_PUBLIC_USE_SUPABASE_AUTH=true) or NextAuth.
 */
export function useAuth(): {
  data: AuthSession | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signIn: (email: string, password: string) => Promise<{ ok?: boolean; error?: string; user?: AuthSession['user'] }>
  signOut: (options?: { callbackUrl?: string }) => Promise<void>
  update: (data?: AuthSession | null) => Promise<void>
} {
  const supabaseAuth = useContext(SupabaseAuthContext)
  const nextAuth = useSession()
  const session = nextAuth.data as AuthSession | undefined

  if (process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true' && supabaseAuth) {
    return supabaseAuth
  }

  return {
    data: session ?? null,
    status: nextAuth.status,
    signIn: async (email: string, password: string) => {
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      })
      return { ok: result?.ok ?? false, error: result?.error ?? undefined }
    },
    signOut: async (options?: { callbackUrl?: string }) => {
      await nextAuthSignOut({ callbackUrl: options?.callbackUrl ?? '/login' })
    },
    update: async () => {
      await nextAuth.update()
    },
  }
}
