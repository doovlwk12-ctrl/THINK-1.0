import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role') as 'CLIENT' | 'ENGINEER' | 'ADMIN' | null

    const whereClause = role ? { role } : {}

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        clientOrders: {
          select: {
            id: true,
          },
        },
        engineerOrders: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform the data to include completed orders count
    const usersWithStats = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      ordersCount: user.clientOrders.length,
      completedOrdersCount: user.role === 'ENGINEER' ? user.engineerOrders.length : 0,
    }))

    return Response.json({
      success: true,
      users: usersWithStats,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
