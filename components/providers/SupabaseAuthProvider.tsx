'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AuthRole, AuthSession } from '@/hooks/useAuth'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type SignInResult = { ok?: boolean; error?: string; user?: AuthSession['user'] }

interface SupabaseAuthContextValue {
  data: AuthSession | null
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: (options?: { callbackUrl?: string }) => Promise<void>
  update: (data?: AuthSession | null) => Promise<void>
}

export const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null)

async function fetchMe(): Promise<AuthSession | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (!res.ok) return null
  const json = await res.json()
  const u = json?.user
  if (!u?.id) return null
  return {
    user: {
      id: u.id,
      name: u.name ?? null,
      email: u.email ?? null,
      role: (u.role as AuthRole) ?? 'CLIENT',
    },
  }
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext)
  if (!ctx) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider')
  }
  return ctx
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [data, setData] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const loadUser = useCallback(async () => {
    const session = await fetchMe()
    setData(session)
    setStatus(session ? 'authenticated' : 'unauthenticated')
  }, [])

  /** جلسة مؤقتة من Supabase فقط (قبل جلب الدور من الـ API) حتى لا يظهر الهيدر "تسجيل الدخول" */
  const sessionToAuthSession = useCallback((s: { user: { id: string; email?: string; user_metadata?: { name?: string } } }): AuthSession => ({
    user: {
      id: s.user.id,
      name: s.user.user_metadata?.name ?? null,
      email: s.user.email ?? null,
      role: 'CLIENT',
    },
  }), [])

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: { user?: { id: string; email?: string; user_metadata?: { name?: string } } } | null) => {
      if (session?.user) {
        setData(sessionToAuthSession({ user: session.user }))
        setStatus('authenticated')
        loadUser()
      } else {
        setData(null)
        setStatus('unauthenticated')
      }
    })
    supabase.auth.getSession().then(({ data }: { data: { session: { user?: { id: string; email?: string; user_metadata?: { name?: string } } } | null } }) => {
      if (data?.session?.user) {
        setData(sessionToAuthSession({ user: data.session.user }))
        setStatus('authenticated')
        loadUser()
      } else {
        setData(null)
        setStatus('unauthenticated')
      }
    })
    return () => subscription.unsubscribe()
  }, [loadUser, sessionToAuthSession])

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const supabase = createClient()
      const { data: result, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return { ok: false, error: error.message }
      }
      if (result?.user) {
        // إعطاء المتصفح وقتاً لكتابة كوكيز الجلسة قبل أي طلب تالٍ (مهم للـ middleware)
        await new Promise((r) => setTimeout(r, 400))
        const session = await fetchMe()
        setData(session)
        setStatus(session ? 'authenticated' : 'unauthenticated')
        return { ok: true, user: session?.user }
      }
      return { ok: false, error: 'Unknown error' }
    },
    []
  )

  const signOut = useCallback(
    async (options?: { callbackUrl?: string }) => {
      const supabase = createClient()
      await supabase.auth.signOut()
      setData(null)
      setStatus('unauthenticated')
      router.push(options?.callbackUrl ?? '/login')
    },
    [router]
  )

  const update = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  const value: SupabaseAuthContextValue = {
    data,
    status,
    signIn,
    signOut,
    update,
  }

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}
