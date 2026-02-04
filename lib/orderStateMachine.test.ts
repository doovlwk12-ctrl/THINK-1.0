import { describe, it, expect } from 'vitest'
import {
  canTransition,
  validateTransition,
  type OrderStatus,
  type TransitionActor,
} from './orderStateMachine'

const statuses: OrderStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'CLOSED',
  'ARCHIVED',
]

describe('orderStateMachine', () => {
  describe('canTransition', () => {
    it('allows same status (no-op)', () => {
      for (const s of statuses) {
        expect(canTransition(s, s, 'engineer')).toBe(true)
        expect(canTransition(s, s, 'client')).toBe(true)
        expect(canTransition(s, s, 'admin')).toBe(true)
      }
    })

    it('allows engineer to move PENDING -> IN_PROGRESS', () => {
      expect(canTransition('PENDING', 'IN_PROGRESS', 'engineer')).toBe(true)
      expect(canTransition('PENDING', 'IN_PROGRESS', 'admin')).toBe(true)
      expect(canTransition('PENDING', 'IN_PROGRESS', 'client')).toBe(false)
    })

    it('allows engineer to move IN_PROGRESS -> REVIEW', () => {
      expect(canTransition('IN_PROGRESS', 'REVIEW', 'engineer')).toBe(true)
      expect(canTransition('IN_PROGRESS', 'REVIEW', 'client')).toBe(false)
    })

    it('allows engineer to move REVIEW -> COMPLETED', () => {
      expect(canTransition('REVIEW', 'COMPLETED', 'engineer')).toBe(true)
      expect(canTransition('IN_PROGRESS', 'COMPLETED', 'engineer')).toBe(true)
    })

    it('allows client to move COMPLETED -> CLOSED', () => {
      expect(canTransition('COMPLETED', 'CLOSED', 'client')).toBe(true)
      expect(canTransition('COMPLETED', 'CLOSED', 'engineer')).toBe(false)
      expect(canTransition('COMPLETED', 'CLOSED', 'admin')).toBe(false)
    })

    it('allows admin/system to archive', () => {
      expect(canTransition('PENDING', 'ARCHIVED', 'admin')).toBe(true)
      expect(canTransition('COMPLETED', 'ARCHIVED', 'admin')).toBe(true)
      expect(canTransition('PENDING', 'ARCHIVED', 'system')).toBe(true)
      expect(canTransition('PENDING', 'ARCHIVED', 'client')).toBe(false)
    })

    it('disallows invalid transitions', () => {
      expect(canTransition('CLOSED', 'PENDING', 'admin')).toBe(false)
      expect(canTransition('COMPLETED', 'IN_PROGRESS', 'client')).toBe(false)
      expect(canTransition('PENDING', 'CLOSED', 'client')).toBe(false)
    })
  })

  describe('validateTransition', () => {
    it('returns valid for allowed transition', () => {
      const r = validateTransition('PENDING', 'IN_PROGRESS', 'engineer')
      expect(r.valid).toBe(true)
    })

    it('returns invalid with Arabic message for disallowed transition', () => {
      const r = validateTransition('PENDING', 'CLOSED', 'client')
      expect(r.valid).toBe(false)
      expect(r.valid === false && r.error).toContain('غير مسموح')
    })

    it('returns valid for same status', () => {
      const r = validateTransition('REVIEW', 'REVIEW', 'engineer')
      expect(r.valid).toBe(true)
    })
  })
})
