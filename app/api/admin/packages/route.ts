import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { revalidatePath, revalidateTag } from 'next/cache'
import { PACKAGES_CACHE_TAG } from '@/lib/cacheTags'

const MAX_PACKAGES = 3

const createPackageSchema = z.object({
  nameAr: z.string().min(1),
  nameEn: z.string().optional(),
  price: z.number().min(0),
  revisions: z.number().int().min(1),
  executionDays: z.number().int().min(1),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).optional(),
})

// Get all packages (admin only)
export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const packages = await prisma.package.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return Response.json({
      success: true,
      packages
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// Create new package
export async function POST(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const activeCount = await prisma.package.count({ where: { isActive: true } })
    if (activeCount >= MAX_PACKAGES) {
      return Response.json(
        {
          success: false,
          error:
            'الحد الأقصى 3 باقات نشطة حالياً. في حال تعطيل باقة يمكنك إضافة باقة جديدة. ميزة إضافة المزيد قادمة.',
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = createPackageSchema.parse(body)
    const { features = [], ...rest } = validatedData
    const featureList = Array.isArray(features) ? features.filter((x): x is string => typeof x === 'string') : []
    const count = await prisma.package.count()
    const maxFeatures = Math.min(count + 1, MAX_PACKAGES)
    if (featureList.length > maxFeatures) {
      return Response.json(
        {
          success: false,
          error: `حد المميزات للباقة الجديدة: ${maxFeatures} ${maxFeatures === 1 ? 'ميزة واحدة' : maxFeatures === 2 ? 'ميزتان' : '3 مميزات'} فقط.`,
        },
        { status: 400 }
      )
    }
    const data = {
      ...rest,
      featuresJson: featureList.length ? JSON.stringify(featureList.slice(0, maxFeatures)) : null,
    }

    const pkg = await prisma.package.create({
      data,
    })

    revalidateTag(PACKAGES_CACHE_TAG)
    revalidatePath('/api/packages')
    revalidatePath('/')

    return Response.json({
      success: true,
      package: pkg
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
