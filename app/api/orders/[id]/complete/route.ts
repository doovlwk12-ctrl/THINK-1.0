import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const orderId = params.id

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

    // يمكن للعميل تأكيد إنهاء الطلب (وضع "منتهي") فقط عندما يكون المهندس قد وضع الطلب مكتملاً
    if (order.status !== 'COMPLETED') {
      return Response.json(
        { success: false, error: order.status === 'CLOSED' || order.status === 'ARCHIVED' ? 'الطلب منتهٍ بالفعل' : 'يمكن تأكيد إنهاء الطلب فقط بعد أن يضع المهندس حالة الطلب مكتمل' },
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

      // تحذير للعميل صاحب الطلب: احتفظ بنسخة المخطط — سيُحذف بعد 45 يوماً من الموعد النهائي
      await tx.notification.create({
        data: {
          userId: order.clientId,
          type: 'archive_purge_warning',
          title: 'تنبيه: احتفظ بنسخة من المخططات',
          message: `تم إنهاء الطلب ${order.orderNumber}. يُرجى حفظ ملفات المخططات لديك — سيتم حذف الملفات من المنصة بعد 45 يوماً من الموعد النهائي ولن تُحفظ في الأرشيف.`,
          data: JSON.stringify({
            orderId,
            orderNumber: order.orderNumber,
            deadline: order.deadline.toISOString(),
          }),
        },
      })

      return updatedOrder
    })

    return Response.json({
      success: true,
      message: 'تم تأكيد إنهاء الطلب بنجاح',
      order: result,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
