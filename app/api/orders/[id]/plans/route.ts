import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(
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

    const orderId = params.id

    const plans = await prisma.plan.findMany({
      where: {
        orderId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // الملفات المحذوفة من الأرشيف لا تُعاد (fileUrl = null)
    const plansForClient = plans.map((p) => ({
      ...p,
      fileUrl: p.purgedAt || !p.fileUrl ? null : p.fileUrl,
      purgedAt: p.purgedAt,
    }))

    return Response.json({
      success: true,
      plans: plansForClient
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
