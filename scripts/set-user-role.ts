/**
 * تغيير دور مستخدم (للتجربة المحلية).
 * الاستخدام: npx tsx scripts/set-user-role.ts <البريد> <الدور>
 * الأدوار: CLIENT | ENGINEER | ADMIN
 * مثال: npx tsx scripts/set-user-role.ts user@example.com ENGINEER
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const role = process.argv[3]?.toUpperCase()

  if (!email || !role) {
    console.error('الاستخدام: npx tsx scripts/set-user-role.ts <البريد> <الدور>')
    console.error('الأدوار: CLIENT | ENGINEER | ADMIN')
    process.exit(1)
  }

  if (!['CLIENT', 'ENGINEER', 'ADMIN'].includes(role)) {
    console.error('الدور يجب أن يكون: CLIENT أو ENGINEER أو ADMIN')
    process.exit(1)
  }

  const user = await prisma.user.updateMany({
    where: { email },
    data: { role },
  })

  if (user.count === 0) {
    console.error('لم يتم العثور على مستخدم بالبريد:', email)
    process.exit(1)
  }

  console.log('تم تحديث الدور بنجاح:', email, '->', role)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
