// Type definitions for enums (for TypeScript type safety)

export type UserRole = 'CLIENT' | 'ENGINEER' | 'ADMIN'

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'CLOSED' | 'ARCHIVED'

// Helper functions for validation
export function isValidUserRole(role: string): role is UserRole {
  return ['CLIENT', 'ENGINEER', 'ADMIN'].includes(role)
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return ['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CLOSED', 'ARCHIVED'].includes(status)
}
