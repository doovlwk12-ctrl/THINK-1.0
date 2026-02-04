/**
 * Legacy auth helpers for API routes. Prefer importing from @/lib/requireAuth instead.
 * These use getApiAuth under the hood so they work with both NextAuth and Supabase.
 */
import { getApiAuth } from '@/lib/getApiAuth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function requireAuth(request: NextRequest) {
  const auth = await getApiAuth(request)
  if (!auth) {
    return NextResponse.json(
      { error: 'غير مصرح - يرجى تسجيل الدخول' },
      { status: 401 }
    )
  }
  const user = { id: auth.userId, role: auth.role }
  const session = { user }
  return { session, user }
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
) {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) return authResult
  const { user } = authResult
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'غير مصرح - لا توجد صلاحية كافية' },
      { status: 403 }
    )
  }
  return authResult
}
