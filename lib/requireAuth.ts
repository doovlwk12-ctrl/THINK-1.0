/**
 * Unified auth helpers for API routes. Use getApiAuth under the hood (NextAuth + Supabase).
 * Prefer requireAuth / requireRole / requireAdmin / requireEngineerOrAdmin / requireClient
 * instead of repeating getApiAuth + role checks in every route.
 */
import { NextResponse } from 'next/server'
import { getApiAuth, type ApiAuth, type ApiRole } from '@/lib/getApiAuth'

const UNAUTHORIZED = NextResponse.json(
  { error: 'غير مصرح - يرجى تسجيل الدخول' },
  { status: 401 }
)

const FORBIDDEN = NextResponse.json(
  { error: 'غير مصرح - لا توجد صلاحية كافية' },
  { status: 403 }
)

export type RequireAuthResult = { auth: ApiAuth }
export type RequireAuthResponse = RequireAuthResult | NextResponse

/**
 * Returns current auth or 401 response.
 */
export async function requireAuth(request: Request): Promise<RequireAuthResponse> {
  const auth = await getApiAuth(request)
  if (!auth) return UNAUTHORIZED
  return { auth }
}

/**
 * Returns current auth if role is in allowedRoles, else 401 or 403.
 */
export async function requireRole(
  request: Request,
  allowedRoles: ApiRole[]
): Promise<RequireAuthResponse> {
  const result = await requireAuth(request)
  if (result instanceof NextResponse) return result
  if (!allowedRoles.includes(result.auth.role)) return FORBIDDEN
  return result
}

export async function requireAdmin(request: Request): Promise<RequireAuthResponse> {
  return requireRole(request, ['ADMIN'])
}

export async function requireEngineerOrAdmin(request: Request): Promise<RequireAuthResponse> {
  return requireRole(request, ['ENGINEER', 'ADMIN'])
}

export async function requireClient(request: Request): Promise<RequireAuthResponse> {
  return requireRole(request, ['CLIENT'])
}
