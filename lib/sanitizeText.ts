/**
 * Lightweight plain-text sanitization for API routes.
 * No DOMPurify/isomorphic-dompurify — avoids ERR_REQUIRE_ESM on Vercel serverless.
 * For HTML sanitization use @/lib/sanitize (sanitizeHtml, sanitizeForDisplay).
 */
export function sanitizeText(text: string): string {
  const withoutHtml = text.replace(/<[^>]*>/g, '')
  const withoutScripts = withoutHtml.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ''
  )
  return withoutScripts.trim()
}
