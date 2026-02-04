import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getApiAuth(request)

    if (!auth) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

    if (auth.role !== 'ENGINEER' && auth.role !== 'ADMIN') {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 403 }
      )
    }

    const orderId = params.id

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Update order status and assign engineer
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'IN_PROGRESS',
        engineerId: auth.userId,
      }
    })

    return Response.json({
      success: true,
      order: updatedOrder
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
