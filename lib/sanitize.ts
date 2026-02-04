/**
 * Input sanitization utilities
 * Removes HTML tags and scripts from user input
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content - removes all HTML tags
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  })
}

/**
 * Sanitize plain text - removes HTML tags and scripts
 */
export function sanitizeText(text: string): string {
  // Remove HTML tags
  const withoutHtml = text.replace(/<[^>]*>/g, '')
  
  // Remove script tags and their content
  const withoutScripts = withoutHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Trim whitespace
  return withoutScripts.trim()
}

/**
 * Sanitize for display - allows safe HTML but removes scripts
 */
export function sanitizeForDisplay(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  })
}
