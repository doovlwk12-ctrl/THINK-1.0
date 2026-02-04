import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

// GET: public – read-only pin pack pricing and messages (for revision page)
export async function GET() {
  try {
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
