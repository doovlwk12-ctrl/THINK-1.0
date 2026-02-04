import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEngineerOrAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { notifyPlanSent } from '@/lib/notifications'
import { sendWhatsAppPlanSent, isOrderRevision } from '@/lib/whatsapp'

const sendPlanSchema = z.object({
  orderId: z.string(),
  planIds: z.array(z.string()).min(1, 'يجب اختيار مخطط واحد على الأقل').max(6, 'الحد الأقصى 6 مخططات'),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, HEAD, POST, OPTIONS' } })
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'استخدم POST مع الجسم { orderId, planIds }' },
    { status: 200, headers: { Allow: 'GET, HEAD, POST, OPTIONS' } }
  )
}

export async function HEAD() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, HEAD, POST, OPTIONS' } })
}

export async function POST(request: NextRequest) {
  try {
    const result = await requireEngineerOrAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const body = await request.json()
    const validatedData = sendPlanSchema.parse(body)

    // Check order
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        client: true
      }
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

    // Check all plans belong to this order
    const plans = await prisma.plan.findMany({
      where: { id: { in: validatedData.planIds }, orderId: validatedData.orderId },
    })
    if (plans.length !== validatedData.planIds.length) {
      return Response.json(
        { error: 'واحد أو أكثر من المخططات غير موجود أو لا ينتمي لهذا الطلب' },
        { status: 400 }
      )
    }

    // Use transaction: deactivate all plans for order, then activate only the selected ones، وتحديث حالة الطلب إلى مكتمل
    await prisma.$transaction(async (tx) => {
      await tx.plan.updateMany({
        where: { orderId: validatedData.orderId },
        data: { isActive: false },
      })
      await tx.plan.updateMany({
        where: { id: { in: validatedData.planIds }, orderId: validatedData.orderId },
        data: { isActive: true },
      })
      const orderForUpdate = await tx.order.findUnique({
        where: { id: validatedData.orderId },
        select: { completedAt: true },
      })
      await tx.order.update({
        where: { id: validatedData.orderId },
        data: {
          status: 'COMPLETED',
          ...(orderForUpdate && !orderForUpdate.completedAt ? { completedAt: new Date() } : {}),
        },
      })
    })

    // Send notification to client
    notifyPlanSent(validatedData.orderId, order.clientId).catch((error: unknown) => {
      logger.error('Failed to send notification', {}, error instanceof Error ? error : new Error(String(error)))
    })

    // Generate WhatsApp message link
    const isRevision = await isOrderRevision(validatedData.orderId)
    const whatsappUrl = await sendWhatsAppPlanSent(
      validatedData.orderId,
      order.clientId,
      isRevision
    )

    return Response.json({
      success: true,
      message: 'تم إرسال المخطط للعميل بنجاح',
      whatsappUrl: whatsappUrl || null,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
