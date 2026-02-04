import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

// GET - Get all engineer applications
export async function GET(request: NextRequest) {
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

    // Check if engineerApplication model exists in Prisma Client
    if (!prisma.engineerApplication) {
      console.error('Prisma Client does not include EngineerApplication model. Please run: npx prisma generate')
      return Response.json(
        { success: false, error: 'خطأ في النظام. يرجى إعادة تشغيل الخادم' },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null

    const whereClause = status ? { status } : {}

    const applications = await prisma.engineerApplication.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        adminNotes: true,
        createdAt: true,
        reviewedAt: true,
        adminId: true
      }
    })

    return Response.json({
      success: true,
      applications
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
