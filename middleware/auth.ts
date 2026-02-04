import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function requireAuth(_request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: 'غير مصرح - يرجى تسجيل الدخول' },
      { status: 401 }
    )
  }

  return { session, user: session.user }
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
) {
  const authResult = await requireAuth(request)

  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'غير مصرح - لا توجد صلاحية كافية' },
      { status: 403 }
    )
  }

  return authResult
}
