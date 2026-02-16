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

    let totalOrders: number
    let totalUsers: number
    let totalClients: number
    let totalEngineers: number
    let activeEngineers: number
    let totalRevenue: { _sum: { amount: number | null } }
    let pendingOrders: number
    let inProgressOrders: number
    let completedOrders: number
    let totalPackages: number
    let activePackages: number
    let recentOrders: number
    let recentRevenue: { _sum: { amount: number | null } }

    try {
      const [
        _totalOrders,
        _totalUsers,
        _totalClients,
        _totalEngineers,
        _activeEngineers,
        _totalRevenue,
        _pendingOrders,
        _inProgressOrders,
        _completedOrders,
        _totalPackages,
        _activePackages,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.user.count(),
        prisma.user.count({ where: { role: 'CLIENT' } }),
        prisma.user.count({ where: { role: 'ENGINEER' } }),
        prisma.user.count({
          where: {
            role: 'ENGINEER',
            engineerOrders: {
              some: { status: { in: ['PENDING', 'IN_PROGRESS', 'REVIEW'] } },
            },
          },
        }),
        prisma.payment.aggregate({
          where: { status: 'completed' },
          _sum: { amount: true },
        }),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.order.count({ where: { status: 'COMPLETED' } }),
        prisma.package.count(),
        prisma.package.count({ where: { isActive: true } }),
      ])

      totalOrders = _totalOrders
      totalUsers = _totalUsers
      totalClients = _totalClients
      totalEngineers = _totalEngineers
      activeEngineers = _activeEngineers
      totalRevenue = _totalRevenue
      pendingOrders = _pendingOrders
      inProgressOrders = _inProgressOrders
      completedOrders = _completedOrders
      totalPackages = _totalPackages
      activePackages = _activePackages

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      recentOrders = await prisma.order.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      recentRevenue = await prisma.payment.aggregate({
        where: {
          status: 'completed',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      })
    } catch (_dbError) {
      return NextResponse.json(
        {
          success: false,
          error: 'تعذر تحميل الإحصائيات. تحقق من اتصال قاعدة البيانات (DATABASE_URL) على Vercel ثم أعد المحاولة.',
        },
        { status: 503 }
      )
    }

    return Response.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalClients,
        totalEngineers,
        activeEngineers,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        recentRevenue: recentRevenue._sum.amount ?? 0,
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
