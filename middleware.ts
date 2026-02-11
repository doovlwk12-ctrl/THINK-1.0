import { withAuth, type NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse, type NextFetchEvent } from 'next/server'
import { apiRateLimit, authRateLimit } from '@/lib/rateLimit'
import { getSupabaseSession } from '@/lib/supabase/middleware'
import { isPublicPath } from '@/lib/routes'

const useSupabaseAuth = process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

/** مسارات المصادقة التي نحدّها بشدة (تسجيل، نسيت كلمة المرور، NextAuth). استثناء: /me و /session و /_log لأنها تُستدعى كثيراً. */
function isStrictAuthPath(path: string): boolean {
  if (path === '/api/auth/register' || path === '/api/auth/forgot-email') return true
  if (!path.startsWith('/api/auth/')) return false
  if (path === '/api/auth/me' || path === '/api/auth/session' || path === '/api/auth/_log') return false
  return true // NextAuth callback, signin, etc.
}

function applyRateLimitHeaders(
  response: NextResponse,
  path: string,
  rateLimitResult: { success: boolean; remaining: number; resetTime: number }
): void {
  if (!path.startsWith('/api/') || !rateLimitResult) return
  const isPollingEndpoint =
    path.includes('/messages/') ||
    path.includes('/notifications') ||
    path.includes('/orders/my-orders') ||
    path.includes('/engineer/orders') ||
    (path.includes('/orders/') && path.includes('/plans')) ||
    path.includes('/revisions/') ||
    path.includes('/packages') ||
    path.includes('/users/profile') ||
    path === '/api/auth/me' ||
    path === '/api/auth/session' ||
    path === '/api/auth/_log'
  let limitValue = '2000'
  if (isStrictAuthPath(path)) limitValue = '10'
  else if (isPollingEndpoint) limitValue = 'unlimited'
  response.headers.set('X-RateLimit-Limit', limitValue)
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
  response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
}

async function runRateLimit(path: string, req: NextRequestWithAuth) {
  if (!path.startsWith('/api/')) return null
  const isPollingEndpoint =
    path.includes('/messages/') ||
    path.includes('/notifications') ||
    path.includes('/orders/my-orders') ||
    path.includes('/engineer/orders') ||
    (path.includes('/orders/') && path.includes('/plans')) ||
    path.includes('/revisions/') ||
    path.includes('/packages') ||
    path.includes('/users/profile') ||
    path === '/api/auth/me' ||
    path === '/api/auth/session' ||
    path === '/api/auth/_log'
  if (!isPollingEndpoint) {
    const limiter = isStrictAuthPath(path) ? authRateLimit : apiRateLimit
    const result = await limiter(req)
    if (!result.success) {
      const retryAfterSec = Math.ceil((result.resetTime - Date.now()) / 1000)
      const authMessage = isStrictAuthPath(path)
        ? `محاولات كثيرة. يمكنك المحاولة مرة أخرى بعد دقيقة (${retryAfterSec} ثانية).`
        : 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.'
      return { response: NextResponse.json(
        { success: false, error: authMessage },
        { status: 429, headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': isStrictAuthPath(path) ? '10' : '2000',
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime),
        } }
      ) }
    }
    return { rateLimitResult: result }
  }
  return { rateLimitResult: { success: true, remaining: 999999, resetTime: Date.now() + 15 * 60 * 1000 } }
}

const authMiddleware = withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    let rateLimitResult: { success: boolean; remaining: number; resetTime: number } | null = null
    const rateLimitOut = await runRateLimit(path, req)
    if (rateLimitOut && 'response' in rateLimitOut) return rateLimitOut.response
    if (rateLimitOut?.rateLimitResult) rateLimitResult = rateLimitOut.rateLimitResult

    if (token) {
      if (path.startsWith('/admin/') && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      if (path.startsWith('/engineer/') && !path.startsWith('/engineer/apply/') && token.role !== 'ENGINEER' && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
      if (path.startsWith('/orders/') && token.role === 'ENGINEER') {
        return NextResponse.redirect(new URL('/engineer/dashboard', req.url))
      }
    }

    const response = NextResponse.next()
    if (path.startsWith('/api/') && rateLimitResult) applyRateLimitHeaders(response, path, rateLimitResult)
    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (isPublicPath(path)) return true
        return !!token
      },
    },
  }
)

async function supabaseMiddleware(req: NextRequestWithAuth, event: NextFetchEvent) {
  const path = req.nextUrl.pathname

  const rateLimitOut = await runRateLimit(path, req)
  if (rateLimitOut && 'response' in rateLimitOut) return rateLimitOut.response
  const rateLimitResult = rateLimitOut?.rateLimitResult ?? null

  const response = NextResponse.next()
  const { response: resWithAuth, user } = await getSupabaseSession(req, response)

  // لا نوجّه طلبات الـ API إلى صفحة تسجيل الدخول — نوجّه الصفحات فقط حتى /api/auth/session وغيره يرجع JSON
  if (!user && !isPublicPath(path) && !path.startsWith('/api/')) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }
  // مستخدم مسجّل يزور صفحة تسجيل الدخول أو التسجيل → توجيهه للوحة التحكم
  if (user && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (path.startsWith('/api/') && rateLimitResult) applyRateLimitHeaders(resWithAuth, path, rateLimitResult)
  return resWithAuth
}

export default async function middleware(
  req: NextRequestWithAuth,
  event: NextFetchEvent
) {
  // #region agent log
  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/') {
    fetch('http://127.0.0.1:7242/ingest/dea19849-5605-4cf4-baa5-fd295f0b235a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'middleware.ts:default',
        message: 'auth mode',
        data: {
          useSupabaseAuth,
          envValue: process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH ?? '(unset)',
          path: req.nextUrl.pathname,
        },
        timestamp: Date.now(),
        hypothesisId: 'H1',
      }),
    }).catch(() => {})
  }
  // #endregion
  if (useSupabaseAuth) return supabaseMiddleware(req, event)
  return authMiddleware(req, event)
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/forgot-email',
    '/reset-password',
    '/dashboard/:path*',
    '/orders/:path*',
    '/engineer/:path*',
    '/admin/:path*',
    '/api/:path*',
  ]
}
