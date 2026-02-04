import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const updatePinPackSchema = z.object({
  pinPackPrice: z.number().min(0),
  pinPackOldPrice: z.number().min(0).nullable().optional(),
  pinPackDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  messageWhen1Left: z.string().nullable().optional(),
  messageWhen0Left: z.string().nullable().optional(),
})

// GET: admin only – fetch pin pack settings
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
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      )
    }

    if (!prisma.pinPackConfig) {
      return Response.json({
        success: true,
        pinPack: {
          pinPackPrice: 0,
          pinPackOldPrice: null,
          pinPackDiscountPercent: null,
          messageWhen1Left: null,
          messageWhen0Left: null,
        },
      })
    }
    const config = await prisma.pinPackConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!config) {
      return Response.json({
        success: true,
        pinPack: {
          pinPackPrice: 0,
          pinPackOldPrice: null,
          pinPackDiscountPercent: null,
          messageWhen1Left: null,
          messageWhen0Left: null,
        },
      })
    }

    return Response.json({
      success: true,
      pinPack: {
        pinPackPrice: config.pinPackPrice,
        pinPackOldPrice: config.pinPackOldPrice,
        pinPackDiscountPercent: config.pinPackDiscountPercent,
        messageWhen1Left: config.messageWhen1Left,
        messageWhen0Left: config.messageWhen0Left,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// PUT: admin only – update pin pack settings (upsert single row)
export async function PUT(request: NextRequest) {
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
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updatePinPackSchema.parse(body)

    if (!prisma.pinPackConfig) {
      return Response.json(
        { success: false, error: 'إعدادات الدبابيس غير متوفرة. يرجى تشغيل prisma generate.' },
        { status: 503 }
      )
    }
    const config = await prisma.pinPackConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    let result
    if (config) {
      result = await prisma.pinPackConfig.update({
        where: { id: config.id },
        data: {
          pinPackPrice: data.pinPackPrice,
          pinPackOldPrice: data.pinPackOldPrice ?? undefined,
          pinPackDiscountPercent: data.pinPackDiscountPercent ?? undefined,
          messageWhen1Left: data.messageWhen1Left ?? undefined,
          messageWhen0Left: data.messageWhen0Left ?? undefined,
        },
      })
    } else {
      result = await prisma.pinPackConfig.create({
        data: {
          pinPackPrice: data.pinPackPrice,
          pinPackOldPrice: data.pinPackOldPrice ?? undefined,
          pinPackDiscountPercent: data.pinPackDiscountPercent ?? undefined,
          messageWhen1Left: data.messageWhen1Left ?? undefined,
          messageWhen0Left: data.messageWhen0Left ?? undefined,
        },
      })
    }

    return Response.json({
      success: true,
      pinPack: {
        pinPackPrice: result.pinPackPrice,
        pinPackOldPrice: result.pinPackOldPrice,
        pinPackDiscountPercent: result.pinPackDiscountPercent,
        messageWhen1Left: result.messageWhen1Left,
        messageWhen0Left: result.messageWhen0Left,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
