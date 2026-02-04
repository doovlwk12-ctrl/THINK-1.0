import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { revalidatePath, revalidateTag } from 'next/cache'
import { PACKAGES_CACHE_TAG } from '@/lib/cacheTags'

const updatePackageSchema = z.object({
  nameAr: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  price: z.number().min(0).optional(),
  revisions: z.number().int().min(1).optional(),
  executionDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  features: z.array(z.string()).optional(),
})

// Update package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    const { id: packageId } = await Promise.resolve(params)
    if (!packageId) {
      return Response.json({ success: false, error: 'معرف الباقة مطلوب' }, { status: 400 })
    }
    const body = await request.json()
    const validatedData = updatePackageSchema.parse(body)
    const { features, ...rest } = validatedData
    const data: Record<string, unknown> = { ...rest }

    if (features !== undefined) {
      const featureList = Array.isArray(features) ? features.filter((x): x is string => typeof x === 'string') : []
      const allPackages = await prisma.package.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      const idx = allPackages.findIndex((p) => p.id === packageId)
      const maxFeatures = idx >= 0 ? idx + 1 : 1
      if (featureList.length > maxFeatures) {
        return Response.json(
          {
            success: false,
            error: `حد المميزات لهذه الباقة: ${maxFeatures} ${maxFeatures === 1 ? 'ميزة واحدة' : maxFeatures === 2 ? 'ميزتان' : '3 مميزات'} فقط.`,
          },
          { status: 400 }
        )
      }
      data.featuresJson = featureList.length ? JSON.stringify(featureList.slice(0, maxFeatures)) : null
    }

    const pkg = await prisma.package.update({
      where: { id: packageId },
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

// Delete package
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    const { id: packageId } = await Promise.resolve(params)
    if (!packageId) {
      return Response.json({ success: false, error: 'معرف الباقة مطلوب' }, { status: 400 })
    }

    // Check if package has orders
    const ordersCount = await prisma.order.count({
      where: { packageId }
    })

    if (ordersCount > 0) {
      // Instead of deleting, deactivate it
      const pkg = await prisma.package.update({
        where: { id: packageId },
        data: { isActive: false }
      })

      revalidateTag(PACKAGES_CACHE_TAG)
      revalidatePath('/api/packages')
      revalidatePath('/')

      return Response.json({
        success: true,
        message: 'تم إلغاء تفعيل الباقة (لديها طلبات مرتبطة)',
        package: pkg
      })
    }

    await prisma.package.delete({
      where: { id: packageId }
    })

    revalidateTag(PACKAGES_CACHE_TAG)
    revalidatePath('/api/packages')
    revalidatePath('/')

    return Response.json({
      success: true,
      message: 'تم حذف الباقة بنجاح'
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
