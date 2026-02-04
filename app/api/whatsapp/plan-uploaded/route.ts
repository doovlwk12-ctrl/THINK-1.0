import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEngineerOrAdmin } from '@/lib/requireAuth'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { generateWhatsAppPlanUploadedUrl } from '@/lib/whatsapp'

const planUploadedSchema = z.object({
  orderId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const result = await requireEngineerOrAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    // Check if user is engineer or admin
    if (auth.role !== 'ENGINEER' && auth.role !== 'ADMIN') {
      return Response.json(
        { error: 'غير مصرح - فقط المهندسين يمكنهم الوصول لهذه الميزة' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = planUploadedSchema.parse(body)

    // Get order to verify access
    const { prisma } = await import('@/lib/prisma')
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        client: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check if user is engineer assigned to this order
    if (auth.role === 'ENGINEER' && order.engineerId !== auth.userId) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 403 }
      )
    }

    // Generate WhatsApp URL
    const whatsappUrl = await generateWhatsAppPlanUploadedUrl(
      validatedData.orderId,
      order.clientId
    )

    return Response.json({
      success: true,
      whatsappUrl: whatsappUrl || null,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
