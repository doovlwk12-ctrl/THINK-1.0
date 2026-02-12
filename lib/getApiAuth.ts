/**
 * Get current user id and role for API routes.
 * Supports NextAuth or Supabase Auth based on env.
 * With Supabase: creates Prisma User on first login if missing (sync from auth.users).
 *
 * مهم لصلاحيات المهندس: Order.engineerId يُعيَّن من auth.userId عند تعيين المهندس على الطلب.
 * يجب أن يكون مصدر userId هنا مطابقاً لمصدر التعيين (تجنب وجود مستخدمين مكررين بنفس البريد
 * بآيديات مختلفة؛ عند المطابقة بالبريد نُرجع نفس سجل Prisma المستخدم في التعيين).
 */
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { createClient as createSupabaseServer, createClientFromRequest } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const USE_SUPABASE_AUTH =
  process.env.USE_SUPABASE_AUTH === 'true' ||
  process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

export type AuthSource = 'nextauth' | 'supabase'

export type ApiRole = 'CLIENT' | 'ENGINEER' | 'ADMIN'

export interface ApiAuth {
  userId: string
  source: AuthSource
  role: ApiRole
}

export async function getApiAuth(request: Request): Promise<ApiAuth | null> {
  try {
    if (USE_SUPABASE_AUTH) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !anonKey) {
        return null
      }
      type SupabaseUser = { id: string; email?: string | null; user_metadata?: { full_name?: string; name?: string } | null }
      let user: SupabaseUser | null = null
      try {
        if (request) {
          const supabaseReq = createClientFromRequest(request)
          const { data } = await supabaseReq.auth.getUser()
          user = data?.user as SupabaseUser ?? null
        }
        if (!user?.id) {
          const supabase = await createSupabaseServer()
          const { data } = await supabase.auth.getUser()
          user = data?.user as SupabaseUser ?? null
        }
      } catch {
        return null
      }
      if (!user?.id) return null

      try {
        let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true },
      })
      if (!dbUser && user.email) {
        // Legacy/synced account: Supabase auth user exists but Prisma user has different id (e.g. cuid). Match by email.
        const existingByEmail = await prisma.user.findFirst({
          where: { email: user.email },
          select: { id: true, role: true },
        })
        if (existingByEmail) {
          return { userId: existingByEmail.id, source: 'supabase', role: (existingByEmail.role as ApiRole) ?? 'CLIENT' }
        }
      }
      if (!dbUser) {
        const email = user.email ?? `user-${user.id}@supabase.local`
        const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email.split('@')[0]
        const phone = `supabase-${user.id.slice(0, 8)}`
        const placeholderPassword = await bcrypt.hash(user.id + (process.env.NEXTAUTH_SECRET ?? ''), 10)
        try {
          await prisma.user.create({
            data: {
              id: user.id,
              email,
              name,
              phone,
              password: placeholderPassword,
              role: 'CLIENT',
            },
          })
          dbUser = { id: user.id, role: 'CLIENT' }
        } catch {
          const existingByEmail = await prisma.user.findFirst({
            where: { email },
            select: { id: true, role: true },
          })
          if (existingByEmail) {
            return { userId: existingByEmail.id, source: 'supabase', role: (existingByEmail.role as ApiRole) ?? 'CLIENT' }
          }
          dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, role: true },
          }) ?? null
        }
      }
      if (!dbUser) return null
      const role = (dbUser.role as ApiRole) ?? 'CLIENT'
      return { userId: dbUser.id, source: 'supabase', role }
      } catch {
        return null
      }
    }

    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      const role = (session.user.role as ApiRole) ?? 'CLIENT'
      return { userId: session.user.id, source: 'nextauth', role }
    }

    return null
  } catch {
    return null
  }
}
