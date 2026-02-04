/**
 * Get current user id and role for API routes.
 * Supports NextAuth, Supabase Auth, or Firebase Bearer token based on env.
 * With Supabase: creates Prisma User on first login if missing (sync from auth.users).
 */
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { createClient as createSupabaseServer, createClientFromRequest } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true'
const USE_SUPABASE_AUTH =
  process.env.USE_SUPABASE_AUTH === 'true' ||
  process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

export type AuthSource = 'nextauth' | 'firebase' | 'supabase'

export type ApiRole = 'CLIENT' | 'ENGINEER' | 'ADMIN'

export interface ApiAuth {
  userId: string
  source: AuthSource
  role: ApiRole
}

async function getFirestoreUserRole(uid: string): Promise<ApiRole | null> {
  try {
    const admin = await import('firebase-admin')
    if (!admin.apps.length) {
      const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'think-9a834'
      admin.initializeApp({ projectId })
    }
    const doc = await admin.firestore().collection('users').doc(uid).get()
    if (!doc.exists) return null
    const r = doc.data()?.role as string | undefined
    if (r === 'ADMIN' || r === 'ENGINEER' || r === 'CLIENT') return r as ApiRole
    return 'CLIENT'
  } catch {
    return null
  }
}

export async function getApiAuth(request: Request): Promise<ApiAuth | null> {
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

    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
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
        dbUser = { role: 'CLIENT' }
      } catch {
        const existingByEmail = await prisma.user.findFirst({
          where: { email },
          select: { id: true, role: true },
        })
        if (existingByEmail) {
          dbUser = { role: existingByEmail.role }
          return { userId: existingByEmail.id, source: 'supabase', role: (existingByEmail.role as ApiRole) ?? 'CLIENT' }
        }
        dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        }) ?? null
      }
    }
    if (!dbUser) return null
    const role = (dbUser.role as ApiRole) ?? 'CLIENT'
    return { userId: user.id, source: 'supabase', role }
  }

  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    const role = (session.user.role as ApiRole) ?? 'CLIENT'
    return { userId: session.user.id, source: 'nextauth', role }
  }

  if (!USE_FIREBASE) return null

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const idToken = authHeader.slice(7)
  try {
    const admin = await import('firebase-admin')
    if (!admin.apps.length) {
      const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'think-9a834'
      admin.initializeApp({ projectId })
    }
    const decoded = await admin.auth().verifyIdToken(idToken)
    const role = await getFirestoreUserRole(decoded.uid)
    if (!role) return null
    return { userId: decoded.uid, source: 'firebase', role }
  } catch {
    return null
  }
}
