import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireClient } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addDays } from 'date-fns'
import { generateOrderNumber } from '@/lib/utils'
import { handleApiError } from '@/lib/errors'

const createOrderSchema = z.object({
  packageId: z.string(),
  formData: z.record(z.any()),
})

export async function POST(request: NextRequest) {
  try {
    const result = await requireClient(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const body = await request.json()
    const validatedData = createOrderSchema.parse(body)

    // Get package
    const pkg = await prisma.package.findUnique({
      where: { id: validatedData.packageId }
    })

    if (!pkg) {
      return Response.json(
        { success: false, error: 'الباقة غير موجودة' },
        { status: 404 }
      )
    }

    if (!pkg.isActive) {
      return Response.json(
        { success: false, error: 'الباقة غير متاحة' },
        { status: 400 }
      )
    }

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Calculate deadline based on package execution days
    // الموعد النهائي مرتبط بمدة التنفيذ من الباقة
    // يتم إضافة عدد أيام التنفيذ من تاريخ إنشاء الطلب
    const deadline = addDays(new Date(), pkg.executionDays)

    // Create order with calculated deadline
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: auth.userId,
        packageId: pkg.id,
        formData: JSON.stringify(validatedData.formData),
        remainingRevisions: pkg.revisions,
        deadline,
        status: 'PENDING'
      },
      include: {
        package: true
      }
    })

    return Response.json({
      success: true,
      order
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
