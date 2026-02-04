import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import { notifyMessageReceived } from '@/lib/notifications'
import { isOrderExpired } from '@/lib/utils'

const sendMessageSchema = z.object({
  orderId: z.string(),
  content: z.string().min(1, 'محتوى الرسالة مطلوب'),
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
    const validatedData = sendMessageSchema.parse(body)

    // Check order access
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId }
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    if (auth.role !== 'ADMIN' && auth.role !== 'ENGINEER') {
      if (order.clientId !== auth.userId) {
        return Response.json(
          { error: 'غير مصرح' },
          { status: 403 }
        )
      }
    }

    // Check if order is expired (only for clients, admins and engineers can still message)
    if (auth.role === 'CLIENT' && isOrderExpired(order.deadline) && order.status === 'ARCHIVED') {
      return Response.json(
        { error: 'انتهى وقت الطلب. يمكنك شراء تمديد لإعادة تفعيل المحادثة' },
        { status: 400 }
      )
    }

    // Sanitize message content
    const sanitizedContent = sanitizeText(validatedData.content)

    // Create message
    const message = await prisma.message.create({
      data: {
        orderId: validatedData.orderId,
        senderId: auth.userId,
        content: sanitizedContent
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    // Notify the other party (client or engineer)
    const recipientId = order.clientId === auth.userId
      ? order.engineerId
      : order.clientId

    if (recipientId) {
      // Don't await - send notification asynchronously
      notifyMessageReceived(
        validatedData.orderId,
        recipientId,
        message.sender.name
      ).catch((error: unknown) => {
        logger.error('Failed to send notification', {}, error instanceof Error ? error : new Error(String(error)))
      })
    }

    return Response.json({
      success: true,
      message
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
