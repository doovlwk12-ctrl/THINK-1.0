/**
 * Optional error reporting for production (e.g. Sentry).
 * When @sentry/nextjs is installed and SENTRY_DSN is set, captureException will be called.
 * Otherwise no-op to avoid hard dependency.
 */

export function reportError(error: Error, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'production') {
    return
  }
  try {
    // Optional Sentry: only when package and DSN are available
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
    if (dsn && typeof (globalThis as unknown as { Sentry?: { captureException: (e: Error, o?: object) => void } }).Sentry?.captureException === 'function') {
      ;(globalThis as unknown as { Sentry: { captureException: (e: Error, o?: object) => void } }).Sentry.captureException(error, { extra: context })
    }
  } catch {
    // Ignore reporting failures
  }
}
