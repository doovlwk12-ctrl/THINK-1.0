/**
 * Rate Limiting utility for API routes
 * Uses in-memory storage for MVP, can be upgraded to Redis for production
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting
// Note: This resets on server restart, which is fine for MVP
// For production, consider using Redis for distributed rate limiting
const store: RateLimitStore = {}

// Clear store on module load (helps with hot reloading in development)
if (typeof global !== 'undefined' && !(global as Record<string, unknown>).__rateLimitStoreInitialized) {
  Object.keys(store).forEach(key => delete store[key])
  ;(global as Record<string, unknown>).__rateLimitStoreInitialized = true
}

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Maximum number of requests per window
  keyGenerator?: (request: Request) => string
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyGenerator } = options

  return async (request: Request): Promise<{ success: boolean; remaining: number; resetTime: number }> => {
    const now = Date.now()
    const key = keyGenerator ? keyGenerator(request) : getClientIP(request)

    // Clean up expired entries
    cleanupExpiredEntries(now)

    const entry = store[key]

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      }
      return {
        success: true,
        remaining: max - 1,
        resetTime: now + windowMs,
      }
    }

    if (entry.count >= max) {
      return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime,
      }
    }

    // Increment count
    entry.count++
    return {
      success: true,
      remaining: max - entry.count,
      resetTime: entry.resetTime,
    }
  }
}

function getClientIP(request: Request): string {
  // Try to get IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return 'unknown'
}

function cleanupExpiredEntries(now: number) {
  // Clean up entries older than 1 hour to prevent memory leaks
  const oneHourAgo = now - 60 * 60 * 1000
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < oneHourAgo) {
      delete store[key]
    }
  })
}

// Pre-configured rate limiters
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per 15 minutes (high limit for dashboards, orders, plans, revisions, notifications)
})

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 محاولات لكل مسار (تسجيل، نسيت البريد، إلخ) في الدقيقة — لتقليل ظهور "انتظر"
  keyGenerator: (request) => {
    const path = new URL(request.url).pathname
    return `${getClientIP(request)}:${path}`
  },
})

// Lighter rate limit for polling endpoints (messages, notifications)
export const pollingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes (higher limit for polling)
})
