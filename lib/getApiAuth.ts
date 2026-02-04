/**
 * Get current user id and role for API routes.
 * Supports NextAuth, Supabase Auth, or Firebase Bearer token based on env.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient as createSupabaseServer, createClientFromRequest } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const USE_FIREBASE = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true'
const USE_SUPABASE_AUTH = process.env.USE_SUPABASE_AUTH === 'true'

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
    let user: { id: string } | null = null
    if (request) {
      const supabaseReq = createClientFromRequest(request)
      const { data } = await supabaseReq.auth.getUser()
      user = data?.user ?? null
    }
    if (!user?.id) {
      const supabase = await createSupabaseServer()
      const { data } = await supabase.auth.getUser()
      user = data?.user ?? null
    }
    if (!user?.id) return null
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })
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
