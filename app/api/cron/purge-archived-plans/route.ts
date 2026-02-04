import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateHijriMiladi, getArchivePurgeDate } from '@/lib/utils'

const WARNING_DAYS_BEFORE_PURGE = 7

/**
 * يُستدعى من cron يومياً.
 * 1) إرسال تحذير للعميل قبل 7 أيام من حذف الملفات.
 * 2) حذف ملفات الطلبات المنتهية بعد 45 يوماً من الموعد النهائي (الأرشيف يبقى بدون ملفات).
 * التحقق: ?key=CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  const secret = process.env.CRON_SECRET
  if (!secret || key !== secret) {
    return Response.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const now = new Date()
  // طلبات يُحذف ملفاتها اليوم: الموعد النهائي قبل 45 يوماً أو أكثر
  const purgeCutoff = new Date(now)
  purgeCutoff.setDate(purgeCutoff.getDate() - 45)
  // تحذير قبل 7 أيام: الموعد النهائي بين (now-45) و (now-38) أي حذف الملفات خلال 7 أيام
  const warningDeadlineMin = new Date(now)
  warningDeadlineMin.setDate(warningDeadlineMin.getDate() - 45)
  const warningDeadlineMax = new Date(now)
  warningDeadlineMax.setDate(warningDeadlineMax.getDate() - 38)

  let warningsSent = 0
  let purgedCount = 0

  // 1) تحذير قبل 7 أيام من الحذف (للعميل فقط)
  const ordersToWarn = await prisma.order.findMany({
    where: {
      status: { in: ['CLOSED', 'ARCHIVED'] },
      plansPurgedAt: null,
      archivedWarningSentAt: null,
      deadline: {
        gt: warningDeadlineMin,
        lte: warningDeadlineMax,
      },
    },
    select: { id: true, orderNumber: true, clientId: true, deadline: true },
  })

  for (const order of ordersToWarn) {
    const purgeDate = getArchivePurgeDate(order.deadline)
    await prisma.$transaction([
      prisma.notification.create({
        data: {
          userId: order.clientId,
          type: 'archive_purge_reminder',
          title: 'تذكير: حذف ملفات الطلب قريباً',
          message: `طلب ${order.orderNumber}: سيتم حذف الملفات من المنصة خلال ${WARNING_DAYS_BEFORE_PURGE} أيام (حوالي ${formatDateHijriMiladi(purgeDate)}). احتفظ بنسخة من المخططات لديك.`,
          data: JSON.stringify({
            orderId: order.id,
            orderNumber: order.orderNumber,
            purgeDate: purgeDate.toISOString(),
          }),
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { archivedWarningSentAt: now },
      }),
    ])
    warningsSent++
  }

  // 2) حذف الملفات للطلبات التي مرّ عليها 45 يوماً من الموعد النهائي
  const ordersToPurge = await prisma.order.findMany({
    where: {
      status: { in: ['CLOSED', 'ARCHIVED'] },
      plansPurgedAt: null,
      deadline: { lte: purgeCutoff },
    },
    include: { plans: true },
  })

  for (const order of ordersToPurge) {
    await prisma.$transaction([
      ...order.plans.map((plan) =>
        prisma.plan.update({
          where: { id: plan.id },
          data: { purgedAt: now, fileUrl: '' },
        })
      ),
      prisma.order.update({
        where: { id: order.id },
        data: { plansPurgedAt: now },
      }),
    ])
    purgedCount++

    // إشعار للعميل بأن الملفات حُذفت
    await prisma.notification.create({
      data: {
        userId: order.clientId,
        type: 'archive_purged',
        title: 'تم حذف ملفات الطلب من الأرشيف',
        message: `طلب ${order.orderNumber}: تم حذف الملفات من المنصة كما هو متبع. يظهر الطلب في الأرشيف بدون إمكانية تحميل المخططات.`,
        data: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
        }),
      },
    })
  }

  return Response.json({
    success: true,
    warningsSent,
    purgedCount,
  })
}
