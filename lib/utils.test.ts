import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  validatePhoneNumber,
  validateEmail,
  isOrderExpired,
  generateOrderNumber,
} from './utils'

describe('formatCurrency', () => {
  it('formats amount in SAR by default', () => {
    const result = formatCurrency(500)
    // ar-SA locale may output Arabic numerals (٥٠٠) or Western (500)
    expect(result).toMatch(/ر\.س|SAR/i)
    expect(result).toMatch(/٥٠٠|500/)
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/٠|0/)
    expect(result).toMatch(/ر\.س|SAR/i)
  })

  it('formats amount with USD when currency is USD', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toMatch(/١٠٠|100/)
    expect(result).toMatch(/US\$|\$/i)
  })
})

describe('validatePhoneNumber', () => {
  it('accepts valid Saudi mobile starting with 05', () => {
    expect(validatePhoneNumber('0512345678')).toBe(true)
    expect(validatePhoneNumber('0598765432')).toBe(true)
  })

  it('accepts valid Saudi mobile starting with 5', () => {
    expect(validatePhoneNumber('512345678')).toBe(true)
  })

  it('strips spaces and validates', () => {
    expect(validatePhoneNumber('05 1234 5678')).toBe(true)
  })

  it('rejects invalid numbers', () => {
    expect(validatePhoneNumber('0412345678')).toBe(false)
    expect(validatePhoneNumber('12345')).toBe(false)
    expect(validatePhoneNumber('')).toBe(false)
  })
})

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('test@domain.co')).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(validateEmail('invalid')).toBe(false)
    expect(validateEmail('no-at.com')).toBe(false)
    expect(validateEmail('@nodomain.com')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false)
  })
})

describe('isOrderExpired', () => {
  it('returns true when deadline is in the past', () => {
    const past = new Date(Date.now() - 86400000)
    expect(isOrderExpired(past)).toBe(true)
    expect(isOrderExpired(past.toISOString())).toBe(true)
  })

  it('returns false when deadline is in the future', () => {
    const future = new Date(Date.now() + 86400000)
    expect(isOrderExpired(future)).toBe(false)
    expect(isOrderExpired(future.toISOString())).toBe(false)
  })
})

describe('generateOrderNumber', () => {
  it('starts with ORD-', () => {
    expect(generateOrderNumber()).toMatch(/^ORD-/)
  })

  it('contains a hyphen and has reasonable length', () => {
    const num = generateOrderNumber()
    expect(num).toContain('-')
    expect(num.length).toBeGreaterThan(15)
  })

  it('generates different values on successive calls', () => {
    const a = generateOrderNumber()
    const b = generateOrderNumber()
    expect(a).not.toBe(b)
  })
})
