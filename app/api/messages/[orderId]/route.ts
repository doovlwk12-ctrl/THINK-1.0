import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

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
