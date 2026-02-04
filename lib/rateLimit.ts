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
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rateLimit.ts:24',message:'Rate limit check entry',data:{key,now,storeSize:Object.keys(store).length,existingEntry:store[key]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    
    // Clean up expired entries
    cleanupExpiredEntries(now)

    const entry = store[key]

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      }
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rateLimit.ts:33',message:'New rate limit entry created',data:{key,count:1,resetTime:now+windowMs,max,remaining:max-1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return {
        success: true,
        remaining: max - 1,
        resetTime: now + windowMs,
      }
    }

    if (entry.count >= max) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rateLimit.ts:46',message:'Rate limit exceeded',data:{key,count:entry.count,max,resetTime:entry.resetTime,timeUntilReset:entry.resetTime-now},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return {
        success: false,
        remaining: 0,
        resetTime: entry.resetTime,
      }
    }

    // Increment count
    entry.count++
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rateLimit.ts:55',message:'Rate limit incremented',data:{key,count:entry.count,max,remaining:max-entry.count,resetTime:entry.resetTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
    const ip = forwarded.split(',')[0].trim()
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rateLimit.ts:66',message:'IP from x-forwarded-for',data:{ip,forwarded},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return ip
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rateLimit.ts:73',message:'IP from x-real-ip',data:{ip:realIP},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return realIP
  }

  // Fallback to a default key (in production, this should never happen)
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/rateLimit.ts:77',message:'IP fallback to unknown',data:{allHeaders:Object.fromEntries(request.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
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
  windowMs: 60 * 1000, // 1 minute — بعد 5 محاولات ينتظر دقيقة ثم يقدر يحاول مرة ثانية
  max: 5, // 5 محاولات (تسجيل / نسيت البريد) في الدقيقة
})

// Lighter rate limit for polling endpoints (messages, notifications)
export const pollingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes (higher limit for polling)
})
