import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'newest' // newest | oldest | deadline_asc | deadline_desc

    const whereClause = status ? { status } : {}

    const orderByClause =
      sortBy === 'oldest'
        ? { createdAt: 'asc' as const }
        : sortBy === 'deadline_asc'
          ? { deadline: 'asc' as const }
          : sortBy === 'deadline_desc'
            ? { deadline: 'desc' as const }
            : { createdAt: 'desc' as const }

    const [ordersRaw, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
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
          package: {
            select: {
              nameAr: true,
              price: true
            }
          }
        },
        orderBy: orderByClause,
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: whereClause,
      })
    ])

    const orders = ordersRaw.map((o) => ({
      ...o,
      packageForDisplay: {
        nameAr: o.package?.nameAr ?? '',
        price: o.package?.price ?? 0,
      },
    }))

    return Response.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
