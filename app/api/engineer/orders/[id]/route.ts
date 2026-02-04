import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEngineerOrAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const result = await requireEngineerOrAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const { id: orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ error: 'معرف الطلب مطلوب' }, { status: 400 })
    }

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
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50
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
