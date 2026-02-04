import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireClient } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { addDays } from 'date-fns'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authResult = await requireClient(request)
    if (authResult instanceof NextResponse) return authResult
    const { auth } = authResult

    const { id: orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 })
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        package: true,
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

    // Calculate price (100 SAR per extension day)
    const pricePerDay = 100
    const extensionDays = 1 // Always 1 day extension
    const totalPrice = extensionDays * pricePerDay

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: totalPrice,
          method: 'card',
          status: 'completed',
          transactionId: `TXN-EXT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      })

      // Calculate new deadline (add 1 day)
      const currentDeadline = new Date(order.deadline)
      const newDeadline = addDays(currentDeadline, extensionDays)

      // Update order: extend deadline, add 1 revision, reactivate if archived
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          remainingRevisions: {
            increment: 1, // Add 1 revision
          },
          deadline: newDeadline,
          // Reactivate order if it was archived
          status: order.status === 'ARCHIVED' ? 'IN_PROGRESS' : order.status,
        },
      })

      // Create notification for client
      await tx.notification.create({
        data: {
          userId: auth.userId,
          type: 'order_extended',
          title: 'تم تمديد الطلب',
          message: `تم تمديد الطلب ${order.orderNumber} لمدة يوم واحد وإضافة تعديل واحد`,
          data: JSON.stringify({
            orderId,
            extensionDays,
            newDeadline: newDeadline.toISOString(),
          }),
        },
      })

      // Notify engineer if assigned
      if (order.engineerId) {
        await tx.notification.create({
          data: {
            userId: order.engineerId,
            type: 'order_extended',
            title: 'تم تمديد طلب',
            message: `تم تمديد الطلب ${order.orderNumber} من قبل العميل`,
            data: JSON.stringify({
              orderId,
              extensionDays,
              newDeadline: newDeadline.toISOString(),
            }),
          },
        })
      }

      return { payment, order: updatedOrder }
    })

    return Response.json({
      success: true,
      message: 'تم تمديد الطلب بنجاح وإضافة تعديل واحد',
      order: result.order,
      payment: result.payment,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
