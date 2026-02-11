/**
 * تصدير المستخدمين (مهندسون + أدمن) إلى ملف CSV مع البريد وكلمة المرور المخزنة.
 * الاستخدام: npx tsx scripts/export-users-csv.ts
 * الملف يُحفظ في: users-engineers-admins.csv (جذر المشروع)
 *
 * تحذير: الملف يحتوي بيانات حساسة (بريد، هاش كلمة المرور). محظور رفعه إلى Git (موجود في .gitignore).
 * كلمة المرور في القاعدة مشفّرة (bcrypt hash)؛ العمود password في CSV هو الهاش وليس النص الأصلي.
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['ENGINEER', 'ADMIN'] },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      password: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const headers = ['id', 'name', 'email', 'phone', 'password', 'role', 'createdAt', 'updatedAt']
  const rows = users.map((u) =>
    headers.map((h) => escapeCsv(String((u as Record<string, unknown>)[h] ?? ''))).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')

  const outPath = path.join(process.cwd(), 'users-engineers-admins.csv')
  fs.writeFileSync(outPath, '\uFEFF' + csv, 'utf8') // BOM for Excel Arabic

  console.log('تم التصدير:', users.length, 'مستخدم (مهندس + أدمن)')
  console.log('الملف:', outPath)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
