import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuth(request)

    if (!auth) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

    if (auth.role !== 'ENGINEER' && auth.role !== 'ADMIN') {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const sortBy = searchParams.get('sortBy') || 'newest' // newest | oldest | deadline_asc | deadline_desc

    const whereClause = {
      OR: [
        { engineerId: auth.userId },
        { engineerId: null, status: 'PENDING' } // Unassigned pending orders
      ]
    }

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
        select: {
          id: true,
          orderNumber: true,
          status: true,
          engineerId: true,
          deadline: true,
          createdAt: true,
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
