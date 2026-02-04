import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

// GET - Get application info by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const { token } = await Promise.resolve(params)
    if (!token) {
      return Response.json({ success: false, error: 'الرابط غير صحيح' }, { status: 400 })
    }

    // Check if engineerApplication model exists in Prisma Client
    if (!prisma.engineerApplication) {
      console.error('Prisma Client does not include EngineerApplication model. Please run: npx prisma generate')
      return Response.json(
        { success: false, error: 'خطأ في النظام. يرجى إعادة تشغيل الخادم' },
        { status: 500 }
      )
    }

    const application = await prisma.engineerApplication.findUnique({
      where: { token },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true
      }
    })

    if (!application) {
      return Response.json(
        { success: false, error: 'رابط التسجيل غير صحيح' },
        { status: 404 }
      )
    }

    // Check if application is already submitted (has name, email, phone)
    const isSubmitted = !!(application.name && application.email && application.phone)

    return Response.json({
      success: true,
      application: {
        ...application,
        isSubmitted
      }
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// POST - Submit application (set all information)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const { token } = await Promise.resolve(params)
    if (!token) {
      return Response.json({ success: false, error: 'الرابط غير صحيح' }, { status: 400 })
    }
    const body = await request.json()
    const { name, email, phone, password } = body

    // Validate all fields
    if (!name || name.trim().length < 2) {
      return Response.json(
        { success: false, error: 'الاسم يجب أن يكون على الأقل حرفين' },
        { status: 400 }
      )
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, error: 'البريد الإلكتروني غير صحيح' },
        { status: 400 }
      )
    }

    if (!phone || phone.trim().length < 10) {
      return Response.json(
        { success: false, error: 'رقم الجوال غير صحيح' },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return Response.json(
        { success: false, error: 'كلمة المرور يجب أن تكون على الأقل 6 أحرف' },
        { status: 400 }
      )
    }

    // Check if engineerApplication model exists in Prisma Client
    if (!prisma.engineerApplication) {
      console.error('Prisma Client does not include EngineerApplication model. Please run: npx prisma generate')
      return Response.json(
        { success: false, error: 'خطأ في النظام. يرجى إعادة تشغيل الخادم' },
        { status: 500 }
      )
    }

    const application = await prisma.engineerApplication.findUnique({
      where: { token }
    })

    if (!application) {
      return Response.json(
        { success: false, error: 'رابط التسجيل غير صحيح' },
        { status: 404 }
      )
    }

    if (application.status !== 'pending') {
      return Response.json(
        { success: false, error: 'تمت مراجعة هذا الطلب بالفعل' },
        { status: 400 }
      )
    }

    // Check if email or phone already exists in users
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.trim() },
          { phone: phone.trim() }
        ]
      }
    })

    if (existingUser) {
      return Response.json(
        { success: false, error: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل' },
        { status: 400 }
      )
    }

    // Check if there's another pending application with same email/phone
    const existingApplication = await prisma.engineerApplication.findFirst({
      where: {
        OR: [
          { email: email.trim() },
          { phone: phone.trim() }
        ],
        status: 'pending',
        id: { not: application.id }
      }
    })

    if (existingApplication) {
      return Response.json(
        { success: false, error: 'يوجد طلب انضمام معلق بنفس البريد الإلكتروني أو رقم الجوال' },
        { status: 400 }
      )
    }

    // Hash password
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.default.hash(password, 10)

    // Update application with all information
    await prisma.engineerApplication.update({
      where: { token },
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: hashedPassword
      }
    })

    return Response.json({
      success: true,
      message: 'تم تقديم طلب الانضمام بنجاح'
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
