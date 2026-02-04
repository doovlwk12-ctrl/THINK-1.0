import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      )
    }

    if (auth.role !== 'ADMIN') {
      return Response.json(
        { success: false, error: 'غير مصرح - يجب أن تكون مسؤولاً' },
        { status: 403 }
      )
    }

    const applicationId = params.id

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

    if (!application.password) {
      return Response.json(
        { success: false, error: 'المهندس لم يكمل تقديم الطلب بعد' },
        { status: 400 }
      )
    }

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: application.email },
          { phone: application.phone }
        ]
      }
    })

    if (existingUser) {
      return Response.json(
        { success: false, error: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل' },
        { status: 400 }
      )
    }

    // Create user account
    const user = await prisma.user.create({
      data: {
        name: application.name,
        email: application.email,
        phone: application.phone,
        password: application.password,
        role: 'ENGINEER'
      }
    })

    // Update application status
    await prisma.engineerApplication.update({
      where: { id: applicationId },
      data: {
        status: 'approved',
        adminId: auth.userId,
        reviewedAt: new Date()
      }
    })

    return Response.json({
      success: true,
      message: 'تم قبول طلب الانضمام وإنشاء حساب المهندس بنجاح',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
