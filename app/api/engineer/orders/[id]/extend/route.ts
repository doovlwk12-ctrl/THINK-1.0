import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEngineerOrAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { addDays } from 'date-fns'

const extendDeadlineSchema = z.object({
  days: z.number().int().min(1).max(30), // Max 30 days extension
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const authResult = await requireEngineerOrAdmin(request)
    if (authResult instanceof NextResponse) return authResult
    const { auth } = authResult

    // Only engineers and admins can extend deadlines
    if (auth.role !== 'ENGINEER' && auth.role !== 'ADMIN') {
      return Response.json(
        { error: 'غير مصرح - فقط المهندسين يمكنهم تمديد الموعد النهائي' },
        { status: 403 }
      )
    }

    const { id: orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ error: 'معرف الطلب مطلوب' }, { status: 400 })
    }
    const body = await request.json()
    const validatedData = extendDeadlineSchema.parse(body)

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
      },
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check if engineer is assigned to this order
    if (auth.role === 'ENGINEER' && order.engineerId !== auth.userId) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 403 }
      )
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Extend deadline
      const newDeadline = addDays(new Date(order.deadline), validatedData.days)

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          deadline: newDeadline,
        },
      })

      // Create notification for client
      await tx.notification.create({
        data: {
          userId: order.clientId,
          type: 'deadline_extended',
          title: 'تم تمديد الموعد النهائي',
          message: `تم تمديد الموعد النهائي للطلب ${order.orderNumber} بمقدار ${validatedData.days} يوم`,
          data: JSON.stringify({
            orderId,
            days: validatedData.days,
            newDeadline: newDeadline.toISOString(),
          }),
        },
      })

      return updatedOrder
    })

    return Response.json({
      success: true,
      message: `تم تمديد الموعد النهائي بمقدار ${validatedData.days} يوم`,
      order: result,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
