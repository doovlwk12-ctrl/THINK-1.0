import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const createPaymentSchema = z.object({
  orderId: z.string(),
  method: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createPaymentSchema.parse(body)

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: { package: true }
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    if (order.clientId !== auth.userId) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 403 }
      )
    }

    // Check if initial payment already completed
    const existingPayment = await prisma.payment.findFirst({
      where: { orderId: validatedData.orderId },
      orderBy: { createdAt: 'asc' }
    })

    if (existingPayment?.status === 'completed') {
      return Response.json(
        { error: 'تم الدفع مسبقاً' },
        { status: 400 }
      )
    }

    // Use transaction to ensure payment and order status are updated atomically
    const payment = await prisma.$transaction(async (tx) => {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const paymentRecord = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              method: validatedData.method,
              status: 'completed',
              transactionId
            }
          })
        : await tx.payment.create({
            data: {
              orderId: validatedData.orderId,
              amount: order.package.price,
              method: validatedData.method,
              status: 'completed',
              transactionId
            }
          })

      // Update order status
      await tx.order.update({
        where: { id: validatedData.orderId },
        data: { status: 'PENDING' }
      })

      return paymentRecord
    })

    return Response.json({
      success: true,
      payment
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
