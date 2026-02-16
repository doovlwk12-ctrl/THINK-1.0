import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).optional(),
})

const putNotificationsSchema = z.object({
  notificationIds: z.array(z.string().min(1)).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const searchParams = request.nextUrl.searchParams
    const query = getNotificationsQuerySchema.parse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 20,
      unreadOnly: searchParams.get('unreadOnly') ?? undefined,
    })
    const { page, limit, unreadOnly: unreadOnlyVal } = query
    const skip = (page - 1) * limit
    const unreadOnly = unreadOnlyVal === 'true'

    const whereClause = {
      userId: auth.userId,
      ...(unreadOnly && { isRead: false }),
    }

    let notifications: Awaited<ReturnType<typeof prisma.notification.findMany>>
    let total: number
    let unreadCount: number
    try {
      ;[notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where: whereClause }),
        prisma.notification.count({
          where: { userId: auth.userId, isRead: false },
        }),
      ])
    } catch (_dbError) {
      return NextResponse.json(
        { success: false, error: 'تعذر تحميل الإشعارات. تحقق من اتصال قاعدة البيانات ثم أعد المحاولة.' },
        { status: 503 }
      )
    }

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
    const { notificationIds } = putNotificationsSchema.parse(body)

    if (notificationIds && notificationIds.length > 0) {
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
