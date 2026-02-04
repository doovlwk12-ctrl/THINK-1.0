import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

const createPaymentSchema = z.object({
  orderId: z.string(),
  method: z.string(),
  idempotencyKey: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

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

    // Idempotency: if key provided and we have a recent record, return same response
    const idempotencyKey = validatedData.idempotencyKey
    if (idempotencyKey) {
      const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS)
      const existing = await prisma.paymentIdempotency.findUnique({
        where: { idempotencyKey },
      })
      if (existing && existing.createdAt >= cutoff) {
        const payment = await prisma.payment.findUnique({
          where: { id: existing.paymentId },
        })
        if (payment && payment.orderId === validatedData.orderId) {
          return Response.json({ success: true, payment })
        }
      }
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
    try {
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

        if (idempotencyKey) {
          await tx.paymentIdempotency.create({
            data: {
              idempotencyKey,
              orderId: validatedData.orderId,
              paymentId: paymentRecord.id,
            },
          })
        }

        return paymentRecord
      })

      logger.info('payment_created', { orderId: validatedData.orderId, userId: auth.userId, paymentId: payment.id })
      return Response.json({
        success: true,
        payment
      })
    } catch (err: unknown) {
      // Unique constraint violation: another request already created payment for this key
      const prismaErr = err as { code?: string }
      if (prismaErr?.code === 'P2002' && idempotencyKey) {
        const existing = await prisma.paymentIdempotency.findUnique({
          where: { idempotencyKey },
        })
        if (existing) {
          const payment = await prisma.payment.findUnique({
            where: { id: existing.paymentId },
          })
          if (payment) {
            return Response.json({ success: true, payment })
          }
        }
      }
      throw err
    }
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
