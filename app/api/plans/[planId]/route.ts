import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireEngineerOrAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { deleteFileByUrl } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> | { planId: string } }
) {
  try {
    const result = await requireEngineerOrAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

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

    // حذف الملف من التخزين (محلي أو Supabase) حتى تُطبَّق التعديلات عند إعادة الرفع وتظهر الصور
    if (plan.fileUrl?.trim()) {
      try {
        const url = plan.fileUrl.trim().startsWith('//') ? `https:${plan.fileUrl.trim()}` : plan.fileUrl.trim()
        await deleteFileByUrl(url)
        const pathMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
        if (pathMatch?.[1]) {
          await prisma.fileExpiryTracker.deleteMany({ where: { filePath: pathMatch[1] } })
        }
      } catch (fileError: unknown) {
        logger.warn('حذف الملف من التخزين فشل أو الملف غير موجود، نكمل حذف السجل', {
          planId,
          error: fileError instanceof Error ? fileError.message : String(fileError),
        })
      }
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
