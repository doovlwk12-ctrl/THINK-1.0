import { withAuth, type NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse, type NextFetchEvent } from 'next/server'
import { apiRateLimit, authRateLimit } from '@/lib/rateLimit'

const useFirebaseAuth = process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH === 'true'

const authMiddleware = withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Apply rate limiting to API routes
    let rateLimitResult: { success: boolean; remaining: number; resetTime: number } | null = null
    
    if (path.startsWith('/api/')) {
      // Skip rate limiting for polling and frequently-used read endpoints
      const isPollingEndpoint =
        path.includes('/messages/') ||
        path.includes('/notifications') ||
        path.includes('/orders/my-orders') ||
        path.includes('/engineer/orders') ||
        (path.includes('/orders/') && path.includes('/plans')) ||
        path.includes('/revisions/') ||
        path.includes('/packages') ||
        path.includes('/users/profile')
      
      if (!isPollingEndpoint) {
        // Determine which rate limiter to use based on endpoint
        let limiter = apiRateLimit
        let limitValue = '2000'
        
        if (path.includes('/auth/')) {
          limiter = authRateLimit
          limitValue = '5'
        }
        
        rateLimitResult = await limiter(req)

        if (!rateLimitResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً.',
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
                'X-RateLimit-Limit': limitValue,
                'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                'X-RateLimit-Reset': String(rateLimitResult.resetTime),
              },
            }
          )
        }
      } else {
        // Polling endpoints: no rate limiting, but set headers to indicate unlimited
        rateLimitResult = {
          success: true,
          remaining: 999999,
          resetTime: Date.now() + 15 * 60 * 1000,
        }
      }
    }

    // Redirect based on role
    if (token) {
      // Protect admin routes - only ADMIN can access
      if (path.startsWith('/admin/') && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      // Protect engineer routes - ENGINEER and ADMIN can access
      // But allow /engineer/apply/ for unauthenticated users
      if (path.startsWith('/engineer/') && !path.startsWith('/engineer/apply/') && token.role !== 'ENGINEER' && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      if (path.startsWith('/orders/') && token.role === 'ENGINEER') {
        // Engineers should use /engineer/orders
        return NextResponse.redirect(new URL('/engineer/dashboard', req.url))
      }
    }

    const response = NextResponse.next()
    
    // Add rate limit headers if API route (using the result from the single check above)
    if (path.startsWith('/api/') && rateLimitResult) {
      const isPollingEndpoint =
        path.includes('/messages/') ||
        path.includes('/notifications') ||
        path.includes('/orders/my-orders') ||
        path.includes('/engineer/orders') ||
        (path.includes('/orders/') && path.includes('/plans')) ||
        path.includes('/revisions/') ||
        path.includes('/packages') ||
        path.includes('/users/profile')
      
      let limitValue = '2000'
      if (path.includes('/auth/')) {
        limitValue = '5'
      } else if (isPollingEndpoint) {
        limitValue = 'unlimited'
      }
      response.headers.set('X-RateLimit-Limit', limitValue)
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
      response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
    }

    return response
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Allow access to engineer apply page without authentication
        if (path.startsWith('/engineer/apply/')) {
          return true
        }
        
        // Allow access to engineer applications API without authentication
        if (path.startsWith('/api/engineer/applications/')) {
          return true
        }

        // Allow forgot-email and register without authentication
        if (path === '/api/auth/forgot-email' || path === '/api/auth/register') {
          return true
        }
        
        // All other routes require authentication
        return !!token
      },
    },
  }
)

export default async function middleware(
  req: NextRequestWithAuth,
  event: NextFetchEvent
) {
  if (useFirebaseAuth) {
    return NextResponse.next()
  }
  return authMiddleware(req, event)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/orders/:path*',
    '/engineer/:path*',
    '/admin/:path*',
    '/api/:path*',
  ]
}
