import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const { orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ error: 'معرف الطلب مطلوب' }, { status: 400 })
    }

    // Check order access
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (auth.role === 'CLIENT') {
      if (order.clientId !== auth.userId) {
        return Response.json(
          { error: 'غير مصرح' },
          { status: 403 }
        )
      }
    } else if (auth.role === 'ENGINEER') {
      if (order.engineerId !== auth.userId && order.engineerId !== null) {
        return Response.json(
          { error: 'غير مصرح' },
          { status: 403 }
        )
      }
    }
    // ADMIN can access all orders

    // Get revision requests for this order
    const revisionRequests = await prisma.revisionRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    })

    // Parse pins JSON for each revision (fallback to [] if invalid)
    const revisionsWithParsedPins = revisionRequests.map((revision) => {
      let pins: unknown[] = []
      try {
        pins = JSON.parse(revision.pins) as unknown[]
        if (!Array.isArray(pins)) pins = []
      } catch {
        pins = []
      }
      return { ...revision, pins }
    })

    return Response.json({
      success: true,
      revisionRequests: revisionsWithParsedPins,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
