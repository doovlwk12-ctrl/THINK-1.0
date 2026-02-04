import { prisma } from '@/lib/prisma'

export type AuditAction = 'status_change' | 'form_data_edit'

/**
 * Append an audit log entry for an order. Call this when status or form data changes.
 */
export async function appendOrderAuditLog(params: {
  orderId: string
  userId: string
  action: AuditAction
  oldValue?: string | null
  newValue?: string | null
}): Promise<void> {
  await prisma.orderAuditLog.create({
    data: {
      orderId: params.orderId,
      userId: params.userId,
      action: params.action,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
    },
  })
}

const DEFAULT_AUDIT_LIMIT = 50

/**
 * Fetch the last N audit log entries for an order (newest first).
 */
export async function getOrderAuditLogs(orderId: string, limit = DEFAULT_AUDIT_LIMIT) {
  return prisma.orderAuditLog.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
