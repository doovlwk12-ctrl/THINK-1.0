/**
 * Notification service
 * Helper functions to create notifications for various events
 */

import { prisma } from './prisma'

export interface NotificationData {
  orderId?: string
  orderNumber?: string
  planId?: string
  revisionId?: string
  [key: string]: unknown
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: NotificationData
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  })
}

/**
 * Create notification when order is created
 */
export async function notifyOrderCreated(_orderId: string, _clientId: string) {
  // This will be called from order creation API
  // For now, we'll create a placeholder that can be called
  // In a real scenario, you might want to notify admins or available engineers
}

/**
 * Create notification when message is sent
 */
export async function notifyMessageReceived(
  orderId: string,
  recipientId: string,
  senderName: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  })

  return createNotification(
    recipientId,
    'message_received',
    'رسالة جديدة',
    `رسالة جديدة من ${senderName} في الطلب ${order?.orderNumber || orderId}`,
    {
      orderId,
      orderNumber: order?.orderNumber,
    }
  )
}

/**
 * Create notification when plan is sent to client
 */
export async function notifyPlanSent(orderId: string, clientId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  })

  return createNotification(
    clientId,
    'plan_sent',
    'تم إرسال المخطط',
    `تم إرسال المخطط للطلب ${order?.orderNumber || orderId}`,
    {
      orderId,
      orderNumber: order?.orderNumber,
    }
  )
}

/**
 * Create notification when revision is requested
 */
export async function notifyRevisionRequested(
  orderId: string,
  engineerId: string | null,
  revisionId: string
) {
  if (!engineerId) return

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true },
  })

  return createNotification(
    engineerId,
    'revision_requested',
    'طلب تعديل جديد',
    `طلب تعديل جديد للطلب ${order?.orderNumber || orderId}`,
    {
      orderId,
      orderNumber: order?.orderNumber,
      revisionId,
    }
  )
}
