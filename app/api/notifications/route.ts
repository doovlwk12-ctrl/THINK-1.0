import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const whereClause = {
      userId: auth.userId,
      ...(unreadOnly && { isRead: false }),
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: whereClause,
      }),
      prisma.notification.count({
        where: {
          userId: auth.userId,
          isRead: false,
        },
      }),
    ])

    // Parse data JSON for each notification
    const notificationsWithParsedData = notifications.map((notification) => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null,
    }))

    return Response.json({
      success: true,
      notifications: notificationsWithParsedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const body = await request.json()
    const { notificationIds } = body

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: auth.userId,
        },
        data: { isRead: true },
      })
    } else {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: auth.userId,
          isRead: false,
        },
        data: { isRead: true },
      })
    }

    return Response.json({
      success: true,
      message: 'تم تحديث حالة الإشعارات',
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
