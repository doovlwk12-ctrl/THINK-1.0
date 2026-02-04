/**
 * حذف جميع الطلبات (للتطوير/الاختبار).
 * الاستخدام: npx tsx scripts/delete-orders.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.order.deleteMany({})
  console.log('تم حذف عدد الطلبات:', result.count)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
