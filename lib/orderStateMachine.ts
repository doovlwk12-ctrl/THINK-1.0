/**
 * Order status state machine.
 * Centralizes allowed transitions so all status updates go through valid paths.
 */

export const ORDER_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'CLOSED',
  'ARCHIVED',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Who can perform the transition (caller context). */
export type TransitionActor = 'engineer' | 'admin' | 'client' | 'system'

/**
 * Allowed transitions: fromStatus -> toStatus is allowed when performed by actor.
 * Keys: `${fromStatus}->${toStatus}`; value: set of actors that can perform it.
 */
const ALLOWED_TRANSITIONS: Record<string, Set<TransitionActor>> = {
  // Engineer starts work (or admin assigns and starts)
  'PENDING->IN_PROGRESS': new Set(['engineer', 'admin']),
  // Engineer sends plan for review
  'IN_PROGRESS->REVIEW': new Set(['engineer', 'admin']),
  // Engineer marks complete
  'REVIEW->COMPLETED': new Set(['engineer', 'admin']),
  'IN_PROGRESS->COMPLETED': new Set(['engineer', 'admin']),
  // Client confirms completion -> order closed
  'COMPLETED->CLOSED': new Set(['client']),
  // System or admin: archive (e.g. after deadline)
  'COMPLETED->ARCHIVED': new Set(['system', 'admin']),
  'REVIEW->ARCHIVED': new Set(['system', 'admin']),
  'IN_PROGRESS->ARCHIVED': new Set(['system', 'admin']),
  'PENDING->ARCHIVED': new Set(['system', 'admin']),
  // Reopen archived (e.g. after extension purchase)
  'ARCHIVED->IN_PROGRESS': new Set(['system', 'admin']),
  // Engineer reopens to revise
  'COMPLETED->REVIEW': new Set(['engineer', 'admin']),
  'REVIEW->IN_PROGRESS': new Set(['engineer', 'admin']),
  // Client cannot move back; system can close from archived
  'ARCHIVED->CLOSED': new Set(['system', 'admin']),
}

function transitionKey(from: OrderStatus, to: OrderStatus): string {
  return `${from}->${to}`
}

/**
 * Returns true if the transition from `currentStatus` to `newStatus` is allowed for `actor`.
 */
export function canTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  actor: TransitionActor
): boolean {
  if (currentStatus === newStatus) return true
  const key = transitionKey(currentStatus, newStatus)
  const allowed = ALLOWED_TRANSITIONS[key]
  return allowed != null && allowed.has(actor)
}

/**
 * Validates transition and returns an error message if invalid.
 * Use in API routes before updating order status.
 */
export function validateTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  actor: TransitionActor
): { valid: true } | { valid: false; error: string } {
  if (currentStatus === newStatus) return { valid: true }
  if (canTransition(currentStatus, newStatus, actor)) return { valid: true }
  return {
    valid: false,
    error: `الانتقال من ${currentStatus} إلى ${newStatus} غير مسموح في هذه الحالة.`,
  }
}
