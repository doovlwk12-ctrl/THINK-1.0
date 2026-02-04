import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> | { planId: string } }
) {
  try {
    const auth = await getApiAuth(request)

    if (!auth) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      )
    }

    // Check if user is engineer or admin
    if (auth.role !== 'ENGINEER' && auth.role !== 'ADMIN') {
      return Response.json(
        { success: false, error: 'غير مصرح - فقط المهندسين يمكنهم حذف المخططات' },
        { status: 403 }
      )
    }

    // Handle params (could be promise in Next.js 15)
    const resolvedParams = await Promise.resolve(params)
    const planId = resolvedParams.planId

    // Get plan with order info
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        order: {
          select: {
            id: true,
            engineerId: true,
            clientId: true,
          },
        },
      },
    })

    if (!plan) {
      return Response.json(
        { success: false, error: 'المخطط غير موجود' },
        { status: 404 }
      )
    }

    // Check if user is engineer assigned to this order
    if (auth.role === 'ENGINEER' && plan.order.engineerId !== auth.userId) {
      return Response.json(
        { success: false, error: 'غير مصرح - هذا المخطط لا ينتمي لطلبك' },
        { status: 403 }
      )
    }

    // Check if plan is active (sent to client)
    if (plan.isActive) {
      return Response.json(
        { success: false, error: 'لا يمكن حذف المخطط النشط (المرسل للعميل). يرجى إرسال مخطط جديد أولاً' },
        { status: 400 }
      )
    }

    // Delete file from storage
    try {
      // Extract file path from URL
      if (plan.fileUrl.startsWith('/')) {
        // Local file path
        const filePath = join(process.cwd(), 'public', plan.fileUrl)
        try {
          await unlink(filePath)
        } catch (fileError: unknown) {
          // File might not exist, continue with database deletion
          logger.warn('File not found, continuing with database deletion', {
            path: plan.fileUrl,
            error: fileError instanceof Error ? fileError.message : String(fileError),
          })
        }
      } else {
        // Cloud storage URL - log warning but continue
        logger.warn('Cloud storage file deletion not implemented', { fileUrl: plan.fileUrl })
      }
    } catch (fileError: unknown) {
      logger.error('Error deleting file', { planId }, fileError instanceof Error ? fileError : new Error(String(fileError)))
      // Continue with database deletion even if file deletion fails
    }

    // Delete plan from database
    await prisma.plan.delete({
      where: { id: planId },
    })

    return Response.json({
      success: true,
      message: 'تم حذف المخطط بنجاح',
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
