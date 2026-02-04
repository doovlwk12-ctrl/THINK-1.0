import { describe, it, expect } from 'vitest'
import { sanitizeText, sanitizeHtml, sanitizeForDisplay } from './sanitize'

describe('sanitizeText', () => {
  it('removes HTML tags', () => {
    expect(sanitizeText('<p>hello</p>')).toBe('hello')
    expect(sanitizeText('<div>text</div>')).toBe('text')
  })

  it('removes script tags', () => {
    const input = 'safe <script>alert("x")</script> text'
    const result = sanitizeText(input)
    expect(result).not.toMatch(/<script/i)
    expect(result).not.toMatch(/<\/script>/i)
  })

  it('keeps plain text unchanged', () => {
    const plain = 'مرحبا نص عادي'
    expect(sanitizeText(plain)).toBe(plain)
  })

  it('trims whitespace', () => {
    expect(sanitizeText('  trimmed  ')).toBe('trimmed')
  })
})

describe('sanitizeHtml', () => {
  it('strips all HTML tags', () => {
    const result = sanitizeHtml('<p>hello</p><b>world</b>')
    expect(result).not.toMatch(/<[^>]+>/)
    expect(result).toContain('hello')
    expect(result).toContain('world')
  })
})

describe('sanitizeForDisplay', () => {
  it('allows safe tags and removes scripts', () => {
    const result = sanitizeForDisplay('<p>ok</p><script>bad</script>')
    expect(result).toContain('ok')
    expect(result).not.toContain('script')
  })
})
