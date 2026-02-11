/**
 * نقل البيانات من SQLite (prisma/dev.db) إلى PostgreSQL.
 * التشغيل: ضع DATABASE_URL في .env يشير إلى Postgres ثم:
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts
 * مسار SQLite الافتراضي: prisma/dev.db (أو عبر SQLITE_DB_PATH).
 */
import Database from 'better-sqlite3'
import path from 'path'
import { prisma } from '../lib/prisma'

const SQLITE_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'prisma', 'dev.db')

const DATE_COLUMNS = new Set([
  'createdAt', 'updatedAt', 'deadline', 'completedAt', 'plansPurgedAt',
  'archivedWarningSentAt', 'reviewedAt', 'purgedAt',
])

function toDate(val: string | null): Date | null {
  if (val == null) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

function rowToObj(row: Record<string, unknown>, dateColumns: string[]) {
  const out = { ...row }
  for (const col of dateColumns) {
    if (col in out && out[col] != null) (out as Record<string, unknown>)[col] = toDate(String(out[col]))
  }
  return out
}

function dateCols(cols: string[]): string[] {
  return cols.filter((c) => DATE_COLUMNS.has(c))
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl.startsWith('postgresql')) {
    console.error('خطأ: ضع DATABASE_URL يشير إلى PostgreSQL (مثلاً postgresql://user:pass@localhost:5432/db)')
    process.exit(1)
  }

  const fs = await import('fs')
  let sqlitePath = SQLITE_PATH
  if (!fs.existsSync(sqlitePath)) {
    const alt = path.join(process.cwd(), 'prisma', 'prisma', 'dev.db')
    if (fs.existsSync(alt)) sqlitePath = alt
  }
  if (!fs.existsSync(sqlitePath)) {
    console.warn('تحذير: ملف SQLite غير موجود:', SQLITE_PATH, '(أو prisma/prisma/dev.db)')
    console.warn('لا يوجد بيانات لنقلها. تأكد من تشغيل npx prisma db push على Postgres أولاً.')
    process.exit(0)
  }

  const sqlite = new Database(sqlitePath, { readonly: true })
  const dateCols = (cols: string[]) => cols.filter((c) => c === 'createdAt' || c === 'updatedAt' || c === 'deadline' || c === 'completedAt' || c === 'plansPurgedAt' || c === 'archivedWarningSentAt' || c === 'reviewedAt')

  try {
    // 1. User
    const userRows = sqlite.prepare('SELECT * FROM User').all() as Record<string, unknown>[]
    const userDates = dateCols(Object.keys(userRows[0] || {}))
    if (userRows.length) {
      for (const row of userRows) {
        const data = rowToObj(row, userDates)
        await prisma.user.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.user.create>[0]['data'],
          update: {},
        })
      }
      console.log('User:', userRows.length)
    }

    // 2. Package
    const pkgRows = sqlite.prepare('SELECT * FROM Package').all() as Record<string, unknown>[]
    const pkgDates = dateCols(Object.keys(pkgRows[0] || {}))
    if (pkgRows.length) {
      for (const row of pkgRows) {
        const data = rowToObj(row, pkgDates)
        await prisma.package.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.package.create>[0]['data'],
          update: {},
        })
      }
      console.log('Package:', pkgRows.length)
    }

    // 3. Order
    const orderRows = sqlite.prepare('SELECT * FROM "Order"').all() as Record<string, unknown>[]
    const orderDates = dateCols(Object.keys(orderRows[0] || {}))
    if (orderRows.length) {
      for (const row of orderRows) {
        const data = rowToObj(row, orderDates)
        await prisma.order.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.order.create>[0]['data'],
          update: {},
        })
      }
      console.log('Order:', orderRows.length)
    }

    // 4. Plan
    const planRows = sqlite.prepare('SELECT * FROM Plan').all() as Record<string, unknown>[]
    const planDates = dateCols(Object.keys(planRows[0] || {}))
    if (planRows.length) {
      for (const row of planRows) {
        const data = rowToObj(row, planDates)
        await prisma.plan.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.plan.create>[0]['data'],
          update: {},
        })
      }
      console.log('Plan:', planRows.length)
    }

    // 5. Message
    const msgRows = sqlite.prepare('SELECT * FROM Message').all() as Record<string, unknown>[]
    const msgDates = dateCols(Object.keys(msgRows[0] || {}))
    if (msgRows.length) {
      for (const row of msgRows) {
        const data = rowToObj(row, msgDates)
        await prisma.message.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.message.create>[0]['data'],
          update: {},
        })
      }
      console.log('Message:', msgRows.length)
    }

    // 6. Payment
    const payRows = sqlite.prepare('SELECT * FROM Payment').all() as Record<string, unknown>[]
    const payDates = dateCols(Object.keys(payRows[0] || {}))
    if (payRows.length) {
      for (const row of payRows) {
        const data = rowToObj(row, payDates)
        await prisma.payment.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.payment.create>[0]['data'],
          update: {},
        })
      }
      console.log('Payment:', payRows.length)
    }

    // 7. PaymentIdempotency
    const idemRows = sqlite.prepare('SELECT * FROM PaymentIdempotency').all() as Record<string, unknown>[]
    const idemDates = dateCols(Object.keys(idemRows[0] || {}))
    if (idemRows.length) {
      for (const row of idemRows) {
        const data = rowToObj(row, idemDates)
        await prisma.paymentIdempotency.upsert({
          where: { idempotencyKey: String(data.idempotencyKey) },
          create: data as Parameters<typeof prisma.paymentIdempotency.create>[0]['data'],
          update: {},
        })
      }
      console.log('PaymentIdempotency:', idemRows.length)
    }

    // 8. RevisionRequest
    const revRows = sqlite.prepare('SELECT * FROM RevisionRequest').all() as Record<string, unknown>[]
    const revDates = dateCols(Object.keys(revRows[0] || {}))
    if (revRows.length) {
      for (const row of revRows) {
        const data = rowToObj(row, revDates)
        await prisma.revisionRequest.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.revisionRequest.create>[0]['data'],
          update: {},
        })
      }
      console.log('RevisionRequest:', revRows.length)
    }

    // 9. Notification
    const notifRows = sqlite.prepare('SELECT * FROM Notification').all() as Record<string, unknown>[]
    const notifDates = dateCols(Object.keys(notifRows[0] || {}))
    if (notifRows.length) {
      for (const row of notifRows) {
        const data = rowToObj(row, notifDates)
        await prisma.notification.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.notification.create>[0]['data'],
          update: {},
        })
      }
      console.log('Notification:', notifRows.length)
    }

    // 10. PinPackConfig
    const pinConfigRows = sqlite.prepare('SELECT * FROM PinPackConfig').all() as Record<string, unknown>[]
    const pinConfigDates = dateCols(Object.keys(pinConfigRows[0] || {}))
    if (pinConfigRows.length) {
      for (const row of pinConfigRows) {
        const data = rowToObj(row, pinConfigDates)
        await prisma.pinPackConfig.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.pinPackConfig.create>[0]['data'],
          update: {},
        })
      }
      console.log('PinPackConfig:', pinConfigRows.length)
    }

    // 11. RevisionsPurchaseConfig
    const revConfigRows = sqlite.prepare('SELECT * FROM RevisionsPurchaseConfig').all() as Record<string, unknown>[]
    const revConfigDates = dateCols(Object.keys(revConfigRows[0] || {}))
    if (revConfigRows.length) {
      for (const row of revConfigRows) {
        const data = rowToObj(row, revConfigDates)
        await prisma.revisionsPurchaseConfig.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.revisionsPurchaseConfig.create>[0]['data'],
          update: {},
        })
      }
      console.log('RevisionsPurchaseConfig:', revConfigRows.length)
    }

    // 12. PinPackPurchase
    const pinPurchaseRows = sqlite.prepare('SELECT * FROM PinPackPurchase').all() as Record<string, unknown>[]
    const pinPurchaseDates = dateCols(Object.keys(pinPurchaseRows[0] || {}))
    if (pinPurchaseRows.length) {
      for (const row of pinPurchaseRows) {
        const data = rowToObj(row, pinPurchaseDates)
        await prisma.pinPackPurchase.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.pinPackPurchase.create>[0]['data'],
          update: {},
        })
      }
      console.log('PinPackPurchase:', pinPurchaseRows.length)
    }

    // 13. EngineerApplication
    const engRows = sqlite.prepare('SELECT * FROM EngineerApplication').all() as Record<string, unknown>[]
    const engDates = dateCols(Object.keys(engRows[0] || {}))
    if (engRows.length) {
      for (const row of engRows) {
        const data = rowToObj(row, engDates)
        await prisma.engineerApplication.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.engineerApplication.create>[0]['data'],
          update: {},
        })
      }
      console.log('EngineerApplication:', engRows.length)
    }

    // 14. OrderAuditLog
    const auditRows = sqlite.prepare('SELECT * FROM OrderAuditLog').all() as Record<string, unknown>[]
    const auditDates = dateCols(Object.keys(auditRows[0] || {}))
    if (auditRows.length) {
      for (const row of auditRows) {
        const data = rowToObj(row, auditDates)
        await prisma.orderAuditLog.upsert({
          where: { id: String(data.id) },
          create: data as Parameters<typeof prisma.orderAuditLog.create>[0]['data'],
          update: {},
        })
      }
      console.log('OrderAuditLog:', auditRows.length)
    }

    // 15. HomepageContent
    try {
      const homeRows = sqlite.prepare('SELECT * FROM HomepageContent').all() as Record<string, unknown>[]
      const homeDates = dateCols(Object.keys(homeRows[0] || {}))
      if (homeRows.length) {
        for (const row of homeRows) {
          const data = rowToObj(row, homeDates)
          await prisma.homepageContent.upsert({
            where: { id: String(data.id) },
            create: data as Parameters<typeof prisma.homepageContent.create>[0]['data'],
            update: {},
          })
        }
        console.log('HomepageContent:', homeRows.length)
      }
    } catch {
      // جدول قد يكون غير موجود في نسخة قديمة
    }

    console.log('تم نقل البيانات من SQLite إلى PostgreSQL بنجاح.')
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
