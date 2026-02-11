/**
 * مزامنة كلمة المرور لـ مهندس/أدمن من Prisma إلى Supabase Auth.
 * عند فشل تسجيل الدخول عبر Supabase (400) لأن الحساب غير موجود أو كلمة المرور مختلفة،
 * يستدعي العميل هذا المسار بعد التحقق من البريد وكلمة المرور في Prisma،
 * فيُنشئ أو يُحدّث المستخدم في Supabase بنفس كلمة المرور ثم يعيد العميل المحاولة.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors'

const USE_SUPABASE_AUTH =
  process.env.USE_SUPABASE_AUTH === 'true' ||
  process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

const bodySchema = z.object({
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

export async function POST(request: Request) {
  if (!USE_SUPABASE_AUTH) {
    return NextResponse.json(
      { success: false, error: 'المصادقة عبر Supabase غير مفعّلة' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { email, password } = bodySchema.parse(body)

    const admin = createAdminClient()
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'إعداد Supabase غير مكتمل (SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 503 }
      )
    }

    const dbUser = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true, email: true, password: true, name: true, role: true },
    })

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 400 }
      )
    }

    const valid = await bcrypt.compare(password, dbUser.password)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 400 }
      )
    }

    const role = dbUser.role as string
    if (role !== 'ENGINEER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'هذا المسار مخصّص لمزامنة حسابات المهندس والأدمن فقط' },
        { status: 403 }
      )
    }

    // Find Supabase user by email (paginated)
    let supabaseUserId: string | null = null
    let page = 1
    const perPage = 1000
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        return NextResponse.json(
          { success: false, error: 'فشل التحقق من Supabase: ' + error.message },
          { status: 502 }
        )
      }
      const found = data.users.find(
        (u) => u.email?.toLowerCase() === dbUser.email?.toLowerCase()
      )
      if (found) {
        supabaseUserId = found.id
        break
      }
      if (data.users.length < perPage) break
      page++
    }

    if (supabaseUserId) {
      const { error } = await admin.auth.admin.updateUserById(supabaseUserId, {
        password,
      })
      if (error) {
        return NextResponse.json(
          { success: false, error: 'فشل تحديث كلمة المرور في Supabase: ' + error.message },
          { status: 502 }
        )
      }
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: dbUser.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: dbUser.name ?? undefined },
      })
      if (error) {
        return NextResponse.json(
          { success: false, error: 'فشل إنشاء الحساب في Supabase: ' + error.message },
          { status: 502 }
        )
      }
      if (created.user) {
        supabaseUserId = created.user.id
      }
    }

    return NextResponse.json({ success: true, synced: true })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
