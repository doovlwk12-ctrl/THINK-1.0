import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { notifyRevisionRequested } from '@/lib/notifications'
import { isOrderExpired } from '@/lib/utils'

const createRevisionSchema = z.object({
  orderId: z.string(),
  planId: z.string().optional(),
  pins: z.array(
    z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      note: z.string().min(1).max(500),
    })
  ).min(1, 'يجب إضافة دبوس واحد على الأقل'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      )
    }

    // Only clients can create revision requests
    if (auth.role !== 'CLIENT') {
      return Response.json(
        { success: false, error: 'غير مصرح - فقط العملاء يمكنهم طلب التعديلات' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createRevisionSchema.parse(body)

    // Check order (include all active plans to validate client's planId)
    const order = await prisma.order.findUnique({
      where: { id: validatedData.orderId },
      include: {
        plans: {
          where: { isActive: true },
        },
      },
    })

    if (!order) {
      return Response.json(
        { success: false, error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check if order belongs to this client
    if (order.clientId !== auth.userId) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      )
    }

    // الطلب منتهي (العميل أكد إنهاء الطلب) — لا يمكن طلب تعديلات. غير ذلك (REVIEW، COMPLETED، إلخ) العميل يقدر يطلب تعديل.
    if (order.status === 'CLOSED') {
      return Response.json(
        { success: false, error: 'الطلب منتهٍ ولا يمكن طلب تعديلات' },
        { status: 400 }
      )
    }

    // Check if order is expired
    if (isOrderExpired(order.deadline) && order.status === 'ARCHIVED') {
      return Response.json(
        { success: false, error: 'انتهى وقت الطلب. يمكنك شراء تمديد لإعادة تفعيل التعديلات' },
        { status: 400 }
      )
    }

    // Check if there are remaining revisions
    if (order.remainingRevisions <= 0) {
      return Response.json(
        { success: false, error: 'لا توجد تعديلات متبقية. يمكنك شراء تعديلات إضافية' },
        { status: 400 }
      )
    }

    // Check if there's an active plan
    if (order.plans.length === 0) {
      return Response.json(
        { success: false, error: 'لا يوجد مخطط نشط لطلب التعديل عليه' },
        { status: 400 }
      )
    }

    // Resolve which plan to use: client's planId if provided and valid, else first active plan
    const activePlan = validatedData.planId
      ? order.plans.find((p) => p.id === validatedData.planId)
      : order.plans[0]
    if (!activePlan) {
      return Response.json(
        { success: false, error: 'المخطط المختار غير نشط أو غير موجود لهذا الطلب' },
        { status: 400 }
      )
    }

    // Use transaction to ensure consistency
    const revisionRequest = await prisma.$transaction(async (tx) => {
      // Create revision request
      const revision = await tx.revisionRequest.create({
        data: {
          orderId: validatedData.orderId,
          planId: activePlan.id,
          pins: JSON.stringify(validatedData.pins),
          status: 'pending',
        },
      })

      // Decrease remaining revisions and set order to IN_PROGRESS so engineer sees "قيد التنفيذ"
      await tx.order.update({
        where: { id: validatedData.orderId },
        data: {
          remainingRevisions: {
            decrement: 1,
          },
          status: 'IN_PROGRESS',
        },
      })

      return revision
    })

    // Send notification to engineer
    if (order.engineerId) {
      notifyRevisionRequested(
        validatedData.orderId,
        order.engineerId,
        revisionRequest.id
      ).catch((error: unknown) => {
        logger.error('Failed to send notification', {}, error instanceof Error ? error : new Error(String(error)))
      })
    }

    return Response.json({
      success: true,
      revisionRequest,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
