import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const updateSchema = z.object({
  pricePerRevision: z.number().min(0),
  maxRevisionsPerPurchase: z.number().int().min(1).max(100),
})

const DEFAULT_PRICE = 100
const DEFAULT_MAX = 20

// GET: admin only – fetch revisions purchase settings
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
    // جدول غير موجود (P2021): إرجاع إعدادات افتراضية حتى يعمل تحميل الصفحة
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return Response.json({
        success: true,
        settings: {
          pricePerRevision: DEFAULT_PRICE,
          maxRevisionsPerPurchase: DEFAULT_MAX,
        },
      })
    }
    return handleApiError(error)
  }
}

// PUT: admin only – update revisions purchase settings (upsert)
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
    const data = updateSchema.parse(body)

    const existing = await prisma.revisionsPurchaseConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (existing) {
      await prisma.revisionsPurchaseConfig.update({
        where: { id: existing.id },
        data: {
          pricePerRevision: data.pricePerRevision,
          maxRevisionsPerPurchase: data.maxRevisionsPerPurchase,
        },
      })
    } else {
      await prisma.revisionsPurchaseConfig.create({
        data: {
          pricePerRevision: data.pricePerRevision,
          maxRevisionsPerPurchase: data.maxRevisionsPerPurchase,
        },
      })
    }

    const config = await prisma.revisionsPurchaseConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    return Response.json({
      success: true,
      settings: config
        ? { pricePerRevision: config.pricePerRevision, maxRevisionsPerPurchase: config.maxRevisionsPerPurchase }
        : { pricePerRevision: data.pricePerRevision, maxRevisionsPerPurchase: data.maxRevisionsPerPurchase },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
