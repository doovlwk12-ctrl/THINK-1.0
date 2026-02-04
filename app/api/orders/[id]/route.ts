import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { isOrderExpired } from '@/lib/utils'

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

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        package: true,
        payments: {
          select: { status: true },
          orderBy: { createdAt: 'asc' }
        },
        pinPackPurchases: {
          select: { id: true }
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        engineer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        plans: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!order) {
      return Response.json(
        { success: false, error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    // Check access
    if (auth.role !== 'ADMIN' && auth.role !== 'ENGINEER') {
      if (order.clientId !== auth.userId) {
        return Response.json(
          { success: false, error: 'غير مصرح' },
          { status: 403 }
        )
      }
    }

    // Check if order is expired and auto-update status
    const expired = isOrderExpired(order.deadline)
    if (expired && order.status !== 'ARCHIVED' && order.status !== 'CLOSED') {
      // مكتمل + انتهت المدة → منتهي (CLOSED). غير ذلك → أرشفة (ARCHIVED)
      const newStatus = order.status === 'COMPLETED' ? 'CLOSED' : 'ARCHIVED'
      await prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus }
      })
      order.status = newStatus
    }

    const { pinPackPurchases, payments, ...orderRest } = order
    const pinPackPurchasesCount = pinPackPurchases?.length ?? 0
    const payment = payments?.[0] ?? null

    // الملفات المحذوفة من الأرشيف: لا نُعيد fileUrl (يظهر الطلب بدون ملف)
    const plansForClient = (orderRest.plans ?? []).map((p: { fileUrl: string; purgedAt: Date | null }) => ({
      ...p,
      fileUrl: p.purgedAt || !p.fileUrl?.trim() ? null : p.fileUrl,
    }))

    return Response.json({
      success: true,
      order: {
        ...orderRest,
        plans: plansForClient,
        plansPurgedAt: orderRest.plansPurgedAt ?? undefined,
        payment: payment ? { status: payment.status } : null,
        pinPackPurchasesCount,
        isExpired: expired
      }
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
