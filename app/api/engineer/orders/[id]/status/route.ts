import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEngineerOrAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { validateTransition, type OrderStatus } from '@/lib/orderStateMachine'
import { appendOrderAuditLog } from '@/lib/orderAuditLog'
import { logger } from '@/lib/logger'

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CLOSED', 'ARCHIVED']),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const result = await requireEngineerOrAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const resolvedParams = await Promise.resolve(params)
    const orderId = resolvedParams.id

    const body = await request.json()
    const validatedData = updateStatusSchema.parse(body)

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        engineer: true,
        client: true,
      },
    })

    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'api/engineer/orders/[id]/status/route.ts:order-fetched',
        message: 'order engineerId vs auth.userId',
        data: {
          orderId,
          hasOrder: !!order,
          orderEngineerId: order?.engineerId ?? null,
          authUserId: auth.userId,
          strictEqual: order?.engineerId === auth.userId,
          engineerIdType: typeof order?.engineerId,
          userIdType: typeof auth.userId,
          engineerIdLen: (order?.engineerId ?? '').length,
          userIdLen: (auth.userId ?? '').length,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'H1_H2_H5',
      }),
    }).catch(() => {})
    // #endregion

    if (!order) {
      return Response.json(
        { success: false, error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check if engineer is assigned to this order (unless admin).
    // If order has no engineer assigned, allow this engineer to update (they are "taking" the order).
    if (auth.role !== 'ADMIN' && order.engineerId != null && order.engineerId !== auth.userId) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'api/engineer/orders/[id]/status/route.ts:403-branch',
          message: '403 this order not assigned to you',
          data: { orderEngineerId: order.engineerId, authUserId: auth.userId, authRole: auth.role },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'H1_H2_H5',
        }),
      }).catch(() => {})
      // #endregion
      return Response.json(
        { success: false, error: 'غير مصرح - هذا الطلب غير مخصص لك' },
        { status: 403 }
      )
    }

    // Validate status transition via state machine
    const currentStatus = order.status as OrderStatus
    const newStatus = validatedData.status as OrderStatus
    const actor = auth.role === 'ADMIN' ? 'admin' : 'engineer'
    const transition = validateTransition(currentStatus, newStatus, actor)
    if (!transition.valid) {
      return Response.json(
        { success: false, error: transition.error },
        { status: 400 }
      )
    }

    // If order had no engineer assigned, assign current user when engineer updates status
    const assignEngineer = auth.role === 'ENGINEER' && order.engineerId == null

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        ...(assignEngineer ? { engineerId: auth.userId } : {}),
        ...(newStatus === 'COMPLETED' && !order.completedAt
          ? { completedAt: new Date() }
          : {}),
      },
      include: {
        package: true,
        client: true,
        engineer: true,
      },
    })

    if (currentStatus !== newStatus) {
      appendOrderAuditLog({
        orderId,
        userId: auth.userId,
        action: 'status_change',
        oldValue: currentStatus,
        newValue: newStatus,
      }).catch(() => {})
    }

    // Create notification for client if status changed
    if (currentStatus !== newStatus && order.clientId) {
      const statusMessages: Record<string, { title: string; message: string }> = {
        IN_PROGRESS: {
          title: 'تم بدء العمل على طلبك',
          message: `تم بدء العمل على الطلب ${order.orderNumber}`,
        },
        REVIEW: {
          title: 'تم إرسال المخطط للمراجعة',
          message: `تم إرسال المخطط للطلب ${order.orderNumber} وانتظار مراجعتك`,
        },
        COMPLETED: {
          title: 'تم إكمال الطلب',
          message: `تم إكمال الطلب ${order.orderNumber}`,
        },
      }

      const notification = statusMessages[newStatus]
      if (notification) {
        await prisma.notification.create({
          data: {
            userId: order.clientId,
            type: 'order_status_changed',
            title: notification.title,
            message: notification.message,
            data: JSON.stringify({
              orderId,
              orderNumber: order.orderNumber,
              oldStatus: currentStatus,
              newStatus,
            }),
          },
        })
      }
    }

    if (currentStatus !== newStatus) {
      logger.info('order_status_changed', { orderId, userId: auth.userId, from: currentStatus, to: newStatus })
    }
    return Response.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      order: updatedOrder,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: 'بيانات غير صحيحة', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}
