import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'

const rejectSchema = z.object({
  notes: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const applicationId = params.id
    const body = await request.json()
    const { notes } = rejectSchema.parse(body)

    // Check if engineerApplication model exists in Prisma Client
    if (!prisma.engineerApplication) {
      console.error('Prisma Client does not include EngineerApplication model. Please run: npx prisma generate')
      return Response.json(
        { success: false, error: 'خطأ في النظام. يرجى إعادة تشغيل الخادم' },
        { status: 500 }
      )
    }

    const application = await prisma.engineerApplication.findUnique({
      where: { id: applicationId }
    })

    if (!application) {
      return Response.json(
        { success: false, error: 'طلب الانضمام غير موجود' },
        { status: 404 }
      )
    }

    if (application.status !== 'pending') {
      return Response.json(
        { success: false, error: 'تمت مراجعة هذا الطلب بالفعل' },
        { status: 400 }
      )
    }

    // Update application status
    await prisma.engineerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'rejected',
        adminId: auth.userId,
        adminNotes: notes || null,
        reviewedAt: new Date()
      }
    })

    return Response.json({
      success: true,
      message: 'تم رفض طلب الانضمام'
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
