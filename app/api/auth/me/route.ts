import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result
    let dbUser
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, name: true, email: true, role: true },
      })
    } catch (_dbError) {
      return NextResponse.json(
        { error: 'تعذر الاتصال بقاعدة البيانات. تحقق من DATABASE_URL على Vercel ثم أعد المحاولة.' },
        { status: 503 }
      )
    }
    if (!dbUser) {
      return NextResponse.json(
        {
          error: 'تعذر العثور على بيانات المستخدم. إن كنت قد أضفت الحساب من لوحة Supabase فقط، تأكد من ضبط DATABASE_URL على Vercel ثم أعد تحميل الصفحة.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
