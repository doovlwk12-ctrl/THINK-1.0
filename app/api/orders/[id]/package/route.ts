import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addDays } from 'date-fns'
import { handleApiError } from '@/lib/errors'

const updatePackageSchema = z.object({
  packageId: z.string(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const orderId = resolvedParams.id

    const body = await request.json()
    const validatedData = updatePackageSchema.parse(body)

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { package: true },
    })

    if (!order) {
      return Response.json(
        { success: false, error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check access - only client can update their order package
    if (order.clientId !== auth.userId) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      )
    }

    // Check if order already has initial payment (can't change package after payment)
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    })

    if (payment?.status === 'completed') {
      return Response.json(
        { success: false, error: 'لا يمكن تغيير الباقة بعد الدفع' },
        { status: 400 }
      )
    }

    // Get new package
    const newPackage = await prisma.package.findUnique({
      where: { id: validatedData.packageId },
    })

    if (!newPackage) {
      return Response.json(
        { success: false, error: 'الباقة غير موجودة' },
        { status: 404 }
      )
    }

    if (!newPackage.isActive) {
      return Response.json(
        { success: false, error: 'الباقة غير متاحة' },
        { status: 400 }
      )
    }

    // Calculate new deadline based on new package
    const newDeadline = addDays(new Date(), newPackage.executionDays)

    // Update order with new package
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        packageId: newPackage.id,
        remainingRevisions: newPackage.revisions,
        deadline: newDeadline,
      },
      include: {
        package: true,
      },
    })

    return Response.json({
      success: true,
      order: updatedOrder,
      message: 'تم تحديث الباقة بنجاح',
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
