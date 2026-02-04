import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEngineerOrAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await requireEngineerOrAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

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
