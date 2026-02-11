import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

// GET - Get all engineer applications
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    // Check if engineerApplication model exists in Prisma Client
    if (!prisma.engineerApplication) {
      console.error('Prisma Client does not include EngineerApplication model. Please run: npx prisma generate')
      return Response.json(
        { success: false, error: 'خطأ مؤقت في النظام. يرجى المحاولة لاحقاً.' },
        { status: 503 }
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
