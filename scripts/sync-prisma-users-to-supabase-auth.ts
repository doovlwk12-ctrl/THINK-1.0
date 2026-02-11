/**
 * ربط حسابات User (Prisma) الموجودة فقط بمصادقة Supabase.
 * ينشئ مستخدماً في auth.users لكل مستخدم Prisma لا يوجد له سجل في Supabase بنفس البريد.
 * الاستخدام: npx tsx scripts/sync-prisma-users-to-supabase-auth.ts
 *
 * متطلبات البيئة: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * و MIGRATION_TEMP_PASSWORD (كلمة المرور المؤقتة لجميع الحسابات المرتبطة).
 *
 * تحذير: يشغّل مرة واحدة في بيئة آمنة. أبلغ المستخدمين بكلمة المرور المؤقتة ويفضل تغييرها عبر "نسيت كلمة المرور".
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// جذر المشروع من موقع السكريبت (لا يعتمد على process.cwd)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/** تحميل .env يدوياً من مسار ثابت — يتعامل مع BOM واقتباس القيم و \r\n */
function loadEnvFile(filePath: string, override = false) {
  if (!fs.existsSync(filePath)) return
  let raw: Buffer | string = fs.readFileSync(filePath)
  if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) raw = raw.subarray(3)
  const content = (Buffer.isBuffer(raw) ? raw.toString('utf8') : raw).replace(/\r\n/g, '\n')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/\\"/g, '"')
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    if (override || process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile(path.join(root, '.env'))
loadEnvFile(path.join(root, '.env.local'), true)

const prisma = new PrismaClient()

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const tempPassword = process.env.MIGRATION_TEMP_PASSWORD

  if (!url || !serviceRoleKey) {
    console.error('المتغيرات المطلوبة: NEXT_PUBLIC_SUPABASE_URL (أو SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY')
    console.error('الملف المُحمّل من:', path.join(root, '.env'))
    process.exit(1)
  }
  if (!tempPassword || tempPassword.length < 6) {
    console.error('المتغير MIGRATION_TEMP_PASSWORD مطلوب ويجب أن يكون 6 أحرف على الأقل (كلمة مرور مؤقتة للحسابات المرتبطة).')
    process.exit(1)
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  // Collect all auth users' emails (paginated)
  const authEmails = new Set<string>()
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('فشل جلب مستخدمي Supabase:', error.message)
      process.exit(1)
    }
    for (const u of data.users) {
      if (u.email) authEmails.add(u.email.toLowerCase())
    }
    if (data.users.length < perPage) break
    page++
  }

  const prismaUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  })

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const user of prismaUsers) {
    const emailLower = user.email.toLowerCase()
    if (authEmails.has(emailLower)) {
      skipped++
      continue
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: user.name },
    })
    if (error) {
      errors.push(`${user.email}: ${error.message}`)
      continue
    }
    if (data?.user) {
      authEmails.add(emailLower)
      created++
      console.log('تم إنشاء حساب مصادقة:', user.email, `(${user.role})`)
    }
  }

  console.log('---')
  console.log('المعالجة:', prismaUsers.length)
  console.log('تم تخطيهم (موجودون في auth):', skipped)
  console.log('تم إنشاؤهم في Supabase Auth:', created)
  if (errors.length > 0) {
    console.log('أخطاء:', errors.length)
    errors.forEach((e) => console.error(' ', e))
  }
  console.log('كلمة المرور المؤقتة لهذه الحسابات:', tempPassword ? '***' : '(غير معيّنة)')
  console.log('أبلغ المستخدمين بتغيير كلمة المرور عبر "نسيت كلمة المرور" بعد أول دخول.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
