import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitize'
import { notifyMessageReceived } from '@/lib/notifications'
import { isOrderExpired } from '@/lib/utils'

const postMessageSchema = z.object({
  content: z.string().min(1, 'محتوى الرسالة مطلوب'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const orderId = params.orderId

    // Check order access
    const order = await prisma.order.findUnique({
      where: { id: orderId }
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

    const messages = await prisma.message.findMany({
      where: { orderId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        orderId,
        senderId: { not: auth.userId },
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return Response.json({
      success: true,
      messages,
      ...(messages.length > 0 && {
        cursor: messages[messages.length - 1].createdAt.toISOString(),
      })
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const orderId = params.orderId
    const body = await request.json()
    const { content } = postMessageSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id: orderId }
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

    if (auth.role === 'CLIENT' && isOrderExpired(order.deadline) && order.status === 'ARCHIVED') {
      return Response.json(
        { error: 'انتهى وقت الطلب. يمكنك شراء تمديد لإعادة تفعيل المحادثة' },
        { status: 400 }
      )
    }

    const sanitizedContent = sanitizeText(content)

    const message = await prisma.message.create({
      data: {
        orderId,
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

    const recipientId = order.clientId === auth.userId
      ? order.engineerId
      : order.clientId

    if (recipientId) {
      notifyMessageReceived(orderId, recipientId, message.sender.name).catch(
        (error: unknown) => {
          logger.error('Failed to send notification', {}, error instanceof Error ? error : new Error(String(error)))
        }
      )
    }

    return Response.json({
      success: true,
      message
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
