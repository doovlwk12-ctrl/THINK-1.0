import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { revisionId: string } }
) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

    const revisionId = params.revisionId

    // Get revision request
    const revision = await prisma.revisionRequest.findUnique({
      where: { id: revisionId },
      include: {
        order: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
            package: {
              select: {
                nameAr: true,
                price: true
              }
            },
            plans: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    })

    if (!revision) {
      return Response.json(
        { error: 'طلب التعديل غير موجود' },
        { status: 404 }
      )
    }

    // Check access permissions
    if (auth.role === 'CLIENT') {
      if (revision.order.clientId !== auth.userId) {
        return Response.json(
          { error: 'غير مصرح' },
          { status: 403 }
        )
      }
    } else if (auth.role === 'ENGINEER') {
      if (revision.order.engineerId !== auth.userId && revision.order.engineerId !== null) {
        return Response.json(
          { error: 'غير مصرح' },
          { status: 403 }
        )
      }
    }
    // ADMIN can access all revisions

    // Parse pins JSON
    const pins = JSON.parse(revision.pins)

    return Response.json({
      success: true,
      revision: {
        ...revision,
        pins,
        order: revision.order
      }
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
