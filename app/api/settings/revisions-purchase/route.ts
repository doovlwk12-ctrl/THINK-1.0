import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

const DEFAULT_PRICE = 100
const DEFAULT_MAX = 20

// GET: public – read-only revisions purchase settings (for client buy-revisions page)
export async function GET() {
  try {
    const config = await prisma.revisionsPurchaseConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!config) {
      return Response.json({
        success: true,
        settings: {
          pricePerRevision: DEFAULT_PRICE,
          maxRevisionsPerPurchase: DEFAULT_MAX,
        },
      })
    }

    return Response.json({
      success: true,
      settings: {
        pricePerRevision: config.pricePerRevision,
        maxRevisionsPerPurchase: config.maxRevisionsPerPurchase,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
