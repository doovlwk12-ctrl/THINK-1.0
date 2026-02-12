import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { validateTransition, type OrderStatus } from '@/lib/orderStateMachine'
import { appendOrderAuditLog } from '@/lib/orderAuditLog'
import { ARCHIVE_PURGE_DAYS_AFTER_DEADLINE } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authResult = await requireClient(request)
    if (authResult instanceof NextResponse) return authResult
    const { auth } = authResult

    // Only clients can complete orders
    if (auth.role !== 'CLIENT') {
      return Response.json(
        { success: false, error: 'غير مصرح - فقط العملاء يمكنهم تأكيد إكمال الطلب' },
        { status: 403 }
      )
    }

    const { id: orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 })
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        engineer: true,
      },
    })

    if (!order) {
      return Response.json(
        { success: false, error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check if order belongs to this client
    if (order.clientId !== auth.userId) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      )
    }

    const currentStatus = order.status as OrderStatus
    const transition = validateTransition(currentStatus, 'CLOSED', 'client')
    if (!transition.valid) {
      return Response.json(
        { success: false, error: transition.error },
        { status: 400 }
      )
    }

    // وضع الحالة "منتهي" (CLOSED) — لا يمكن بعدها طلب تعديلات
    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CLOSED' },
      })

      if (order.engineerId) {
        await tx.notification.create({
          data: {
            userId: order.engineerId,
            type: 'order_closed',
            title: 'تم إنهاء الطلب',
            message: `أكد العميل إنهاء الطلب ${order.orderNumber}`,
            data: JSON.stringify({
              orderId,
              orderNumber: order.orderNumber,
            }),
          },
        })
      }

      // تحذير للعميل صاحب الطلب: احتفظ بنسخة المخطط — سيُحذف بعد المدة المحددة من الموعد النهائي
      await tx.notification.create({
        data: {
          userId: order.clientId,
          type: 'archive_purge_warning',
          title: 'تنبيه: احتفظ بنسخة من المخططات',
          message: `تم إنهاء الطلب ${order.orderNumber}. يُرجى حفظ ملفات المخططات لديك — سيتم نقل الملفات إلى الأرشيف بعد ${ARCHIVE_PURGE_DAYS_AFTER_DEADLINE} يوماً من الموعد النهائي.`,
          data: JSON.stringify({
            orderId,
            orderNumber: order.orderNumber,
            deadline: order.deadline.toISOString(),
          }),
        },
      })

      return updatedOrder
    })

    appendOrderAuditLog({
      orderId,
      userId: auth.userId,
      action: 'status_change',
      oldValue: 'COMPLETED',
      newValue: 'CLOSED',
    }).catch(() => {})

    return Response.json({
      success: true,
      message: 'تم تأكيد إنهاء الطلب بنجاح',
      order: result,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
