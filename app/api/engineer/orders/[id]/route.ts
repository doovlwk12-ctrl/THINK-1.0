import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(
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
      where: { id: orderId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        package: {
          select: {
            nameAr: true,
            price: true
          }
        },
        plans: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Allow access if: order is assigned to this engineer, OR order is unassigned (null), OR user is admin
    if (order.engineerId !== null && order.engineerId !== auth.userId && auth.role !== 'ADMIN') {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 403 }
      )
    }

    return Response.json({
      success: true,
      order
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
