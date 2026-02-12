import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  formatDateHijriMiladi,
  getArchivePurgeDate,
  ARCHIVE_PURGE_DAYS_AFTER_DEADLINE,
  ARCHIVE_RETENTION_DAYS,
} from '@/lib/utils'
import {
  deleteFromSupabaseBucket,
  getSupabasePublicUrl,
  SUPABASE_BUCKETS,
  createAdminClient,
  uploadToSupabaseBucket,
} from '@/lib/supabase'
import { gzipSync } from 'zlib'

const WARNING_DAYS_BEFORE_PURGE = 7
const BUCKET = SUPABASE_BUCKETS.ORDERS

/** استخراج مسار الملف من رابط Supabase (مثل plans/orderId/file.ext أو archive/orderId/file.ext) */
function getStoragePathFromUrl(fileUrl: string): string | null {
  const match = fileUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  return match ? match[1] : null
}

/**
 * يُستدعى من cron يومياً.
 * 1) إرسال تحذير للعميل قبل 7 أيام من نقل الملفات إلى الأرشيف.
 * 2) نقل ملفات الطلبات المنتهية (بعد ARCHIVE_PURGE_DAYS_AFTER_DEADLINE يوماً من الموعد النهائي) إلى مجلد archive/ في التخزين؛ الطلب يظهر في الأرشيف بدون إمكانية التحميل.
 * 3) بعد مدة الاحتفاظ (ARCHIVE_RETENTION_DAYS) حذف الملفات نهائياً من التخزين.
 * التحقق: ?key=CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')
  const secret = process.env.CRON_SECRET
  if (!secret || key !== secret) {
    return Response.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const now = new Date()
  const purgeCutoff = new Date(now)
  purgeCutoff.setDate(purgeCutoff.getDate() - ARCHIVE_PURGE_DAYS_AFTER_DEADLINE)
  const warningDeadlineMin = new Date(now)
  warningDeadlineMin.setDate(warningDeadlineMin.getDate() - ARCHIVE_PURGE_DAYS_AFTER_DEADLINE)
  const warningDeadlineMax = new Date(now)
  warningDeadlineMax.setDate(warningDeadlineMax.getDate() - (ARCHIVE_PURGE_DAYS_AFTER_DEADLINE - 7))

  const archiveDeleteCutoff = new Date(now)
  archiveDeleteCutoff.setDate(archiveDeleteCutoff.getDate() - ARCHIVE_RETENTION_DAYS)

  let warningsSent = 0
  let purgedCount = 0
  let deletedFromStorageCount = 0
  const supabaseConfigured = !!createAdminClient()

  // 1) تحذير قبل 7 أيام من نقل الملفات إلى الأرشيف (للعميل فقط)
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
          title: 'تذكير: نقل ملفات الطلب إلى الأرشيف قريباً',
          message: `طلب ${order.orderNumber}: سيتم نقل الملفات إلى الأرشيف خلال ${WARNING_DAYS_BEFORE_PURGE} أيام (حوالي ${formatDateHijriMiladi(purgeDate)}). احتفظ بنسخة من المخططات لديك.`,
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

  // 2) نقل الملفات إلى مجلد archive/ للطلبات التي مرّ عليها ARCHIVE_PURGE_DAYS_AFTER_DEADLINE يوماً من الموعد النهائي
  const ordersToPurge = await prisma.order.findMany({
    where: {
      status: { in: ['CLOSED', 'ARCHIVED'] },
      plansPurgedAt: null,
      deadline: { lte: purgeCutoff },
    },
    include: { plans: true },
  })

  const admin = createAdminClient()
  for (const order of ordersToPurge) {
    for (const plan of order.plans) {
      let newFileUrl = ''
      if (supabaseConfigured && admin && plan.fileUrl?.trim()) {
        const fromPath = getStoragePathFromUrl(plan.fileUrl.trim())
        if (fromPath && fromPath.startsWith('plans/')) {
          try {
            const { data: fileData, error: downloadError } = await admin.storage.from(BUCKET).download(fromPath)
            if (downloadError || !fileData) throw new Error('download failed')
            const buffer = Buffer.from(await fileData.arrayBuffer())
            const gzipped = gzipSync(buffer)
            const toPath = fromPath.replace(/^plans\//, 'archive/').replace(/(\.[^.]+)$/, '$1.gz')
            await uploadToSupabaseBucket(BUCKET, toPath, gzipped, { contentType: 'application/gzip' })
            newFileUrl = getSupabasePublicUrl(BUCKET, toPath)
            await deleteFromSupabaseBucket(BUCKET, fromPath)
            await prisma.fileExpiryTracker.deleteMany({ where: { filePath: fromPath } })
          } catch {
            newFileUrl = ''
          }
        }
      }
      await prisma.plan.update({
        where: { id: plan.id },
        data: { purgedAt: now, fileUrl: newFileUrl },
      })
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { plansPurgedAt: now },
    })
    purgedCount++

    await prisma.notification.create({
      data: {
        userId: order.clientId,
        type: 'archive_purged',
        title: 'تم نقل ملفات الطلب إلى الأرشيف',
        message: `طلب ${order.orderNumber}: تم نقل الملفات إلى الأرشيف كما هو متبع. يظهر الطلب في الأرشيف بدون إمكانية تحميل المخططات.`,
        data: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
        }),
      },
    })
  }

  // 3) حذف نهائي من التخزين: مخططات نُقلت إلى archive منذ أكثر من ARCHIVE_RETENTION_DAYS
  if (supabaseConfigured) {
    const plansToDeleteFromStorage = await prisma.plan.findMany({
      where: {
        purgedAt: { lte: archiveDeleteCutoff },
        fileUrl: { not: '' },
      },
      select: { id: true, fileUrl: true },
    })

    for (const plan of plansToDeleteFromStorage) {
      const path = plan.fileUrl ? getStoragePathFromUrl(plan.fileUrl.trim()) : null
      if (path && path.startsWith('archive/')) {
        try {
          await deleteFromSupabaseBucket(BUCKET, path)
          await prisma.plan.update({
            where: { id: plan.id },
            data: { fileUrl: '' },
          })
          deletedFromStorageCount++
        } catch {
          // تجاهل خطأ الحذف (مثلاً الملف محذوف مسبقاً)
        }
      }
    }
  }

  return Response.json({
    success: true,
    warningsSent,
    purgedCount,
    deletedFromStorageCount,
  })
}
