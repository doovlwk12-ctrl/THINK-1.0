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

    // Get all stats in parallel
    const [
      totalOrders,
      totalUsers,
      totalClients,
      totalEngineers,
      activeEngineers,
      totalRevenue,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      totalPackages,
      activePackages,
    ] = await Promise.all([
      // Total orders
      prisma.order.count(),
      
      // Total users
      prisma.user.count(),
      
      // Total clients
      prisma.user.count({
        where: { role: 'CLIENT' },
      }),
      
      // Total engineers
      prisma.user.count({
        where: { role: 'ENGINEER' },
      }),
      
      // Active engineers (engineers with at least one assigned order)
      prisma.user.count({
        where: {
          role: 'ENGINEER',
          engineerOrders: {
            some: {
              status: {
                in: ['PENDING', 'IN_PROGRESS', 'REVIEW'],
              },
            },
          },
        },
      }),
      
      // Total revenue (sum of all paid orders)
      prisma.payment.aggregate({
        where: {
          status: 'completed',
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Pending orders
      prisma.order.count({
        where: { status: 'PENDING' },
      }),
      
      // In progress orders
      prisma.order.count({
        where: { status: 'IN_PROGRESS' },
      }),
      
      // Completed orders
      prisma.order.count({
        where: { status: 'COMPLETED' },
      }),
      
      // Total packages
      prisma.package.count(),
      
      // Active packages
      prisma.package.count({
        where: { isActive: true },
      }),
    ])

    // Get recent orders (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    })

    // Get recent revenue (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentRevenue = await prisma.payment.aggregate({
      where: {
        status: 'completed',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        amount: true,
      },
    })

    return Response.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalClients,
        totalEngineers,
        activeEngineers,
        totalRevenue: totalRevenue._sum.amount || 0,
        recentRevenue: recentRevenue._sum.amount || 0,
        pendingOrders,
        inProgressOrders,
        completedOrders,
        recentOrders,
        totalPackages,
        activePackages,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
