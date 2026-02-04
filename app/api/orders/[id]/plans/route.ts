import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    const { id: orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 })
    }

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
