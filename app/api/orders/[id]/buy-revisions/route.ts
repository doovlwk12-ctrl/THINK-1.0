import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { addDays } from 'date-fns'

// Max will be validated dynamically from config (default 20, admin can set 1–100)
const FALLBACK_MAX = 20
const FALLBACK_PRICE = 100

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authResult = await requireClient(request)
    if (authResult instanceof NextResponse) return authResult
    const { auth } = authResult

    // Only clients can buy revisions
    if (auth.role !== 'CLIENT') {
      return Response.json(
        { error: 'غير مصرح - فقط العملاء يمكنهم شراء تعديلات إضافية' },
        { status: 403 }
      )
    }

    const { id: orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ error: 'معرف الطلب مطلوب' }, { status: 400 })
    }
    const body = await request.json()
    const revisions = typeof body.revisions === 'number' ? Math.floor(body.revisions) : parseInt(String(body.revisions), 10)
    if (Number.isNaN(revisions) || revisions < 1) {
      return Response.json(
        { error: 'عدد التعديلات غير صالح' },
        { status: 400 }
      )
    }

    // Get config for price and max
    const config = await prisma.revisionsPurchaseConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })
    const maxRevisions = config?.maxRevisionsPerPurchase ?? FALLBACK_MAX
    const pricePerRevision = config?.pricePerRevision ?? FALLBACK_PRICE

    if (revisions > maxRevisions) {
      return Response.json(
        { error: `الحد الأقصى لعدد التعديلات في عملية شراء واحدة هو ${maxRevisions}` },
        { status: 400 }
      )
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
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check if order belongs to this client
    if (order.clientId !== auth.userId) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 403 }
      )
    }

    const totalPrice = revisions * pricePerRevision

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record (simulated)
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: totalPrice,
          method: 'card', // Default method
          status: 'completed',
          transactionId: `TXN-REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      })

      // Update order: add revisions and extend deadline (1 day per revision)
      const daysPerRevision = 1
      const newDeadline = addDays(new Date(order.deadline), revisions * daysPerRevision)

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          remainingRevisions: {
            increment: revisions,
          },
          deadline: newDeadline,
        },
      })

      await tx.notification.create({
        data: {
          userId: auth.userId,
          type: 'revisions_purchased',
          title: 'تم شراء تعديلات إضافية',
          message: `تم شراء ${revisions} تعديلات إضافية للطلب ${order.orderNumber} وتم تمديد الموعد النهائي ${revisions} ${revisions === 1 ? 'يوم' : 'أيام'}`,
          data: JSON.stringify({
            orderId,
            revisions,
            extensionDays: revisions,
            newDeadline: newDeadline.toISOString(),
          }),
        },
      })

      return { payment, order: updatedOrder }
    })

    return Response.json({
      success: true,
      message: `تم شراء ${revisions} تعديلات إضافية بنجاح وتم تمديد الموعد النهائي ${revisions} ${revisions === 1 ? 'يوم' : 'أيام'}`,
      order: result.order,
      payment: result.payment,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
