import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

const MAX_PIN_GROUPS = 6

// POST: client – create PinPackPurchase for this order (after payment flow)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const { id: orderId } = await Promise.resolve(params)
    if (!orderId) {
      return Response.json({ success: false, error: 'معرف الطلب مطلوب' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        pinPackPurchases: { select: { id: true } },
      },
    })

    if (!order) {
      return Response.json(
        { success: false, error: 'الطلب غير موجود' },
        { status: 404 }
      )
    }

    if (order.clientId !== auth.userId) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      )
    }

    const currentGroups = 1 + (order.pinPackPurchases?.length ?? 0)
    if (currentGroups >= MAX_PIN_GROUPS) {
      return Response.json(
        { success: false, error: 'وصلت للحد الأقصى من مجموعات الدبابيس (6)' },
        { status: 400 }
      )
    }

    if (!prisma.pinPackConfig) {
      return Response.json(
        { success: false, error: 'إعدادات مجموعة الدبابيس غير متوفرة. يرجى تشغيل prisma generate.' },
        { status: 503 }
      )
    }
    const config = await prisma.pinPackConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!config) {
      return Response.json(
        { success: false, error: 'إعدادات مجموعة الدبابيس غير متوفرة' },
        { status: 500 }
      )
    }

    const amount = config.pinPackPrice
    if (amount <= 0) {
      return Response.json(
        { success: false, error: 'سعر مجموعة الدبابيس غير معرّف' },
        { status: 400 }
      )
    }

    // Create PinPackPurchase (simulated completed – في الإنتاج يُحدّث بعد gateway)
    const purchase = await prisma.pinPackPurchase.create({
      data: {
        orderId,
        amount,
        status: 'completed',
        transactionId: `PIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    })

    return Response.json({
      success: true,
      purchase: {
        id: purchase.id,
        amount: purchase.amount,
        status: purchase.status,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
