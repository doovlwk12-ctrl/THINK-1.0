'use client'

import type { ReactNode } from 'react'
import { SessionProvider } from '@/components/providers/SessionProvider'
import {
  SupabaseAuthContext,
  SupabaseAuthProvider,
} from '@/components/providers/SupabaseAuthProvider'

export function AuthProvider({ children }: { children: ReactNode }) {
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'
  // SessionProvider must always wrap the app so useSession() in useAuth doesn't throw.
  // When Supabase is used, useAuth returns Supabase context and ignores NextAuth session.
  return (
    <SessionProvider>
      {useSupabase ? (
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
      ) : (
        <SupabaseAuthContext.Provider value={null}>
          {children}
        </SupabaseAuthContext.Provider>
      )}
    </SessionProvider>
  )
}
