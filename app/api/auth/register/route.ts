import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { createClientForAuthActions } from '@/lib/supabase/server'

const USE_SUPABASE_AUTH =
  process.env.USE_SUPABASE_AUTH === 'true' ||
  process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === 'true'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
})

function supabaseAuthErrorMessage(err: { message?: string; status?: number }): string {
  const msg = (err?.message ?? '').toLowerCase()
  if (/already registered|already exists|duplicate|user already registered/i.test(msg)) return 'البريد الإلكتروني مستخدم بالفعل'
  if (/invalid email|email.*invalid/i.test(msg)) return 'البريد الإلكتروني غير صحيح'
  if (/password|minimum.*length|at least.*6/i.test(msg)) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
  if (/signup.*disabled|sign_up.*disabled/i.test(msg)) return 'التسجيل معطّل مؤقتاً. يرجى التواصل مع الدعم.'
  if (/rate limit|too many/i.test(msg)) return 'محاولات كثيرة. يرجى المحاولة لاحقاً.'
  return 'فشل إنشاء الحساب. يرجى المحاولة لاحقاً.'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { phone: validatedData.phone }
        ]
      }
    })

    if (existingUser) {
      return Response.json(
        { error: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل' },
        { status: 400 }
      )
    }

    if (USE_SUPABASE_AUTH) {
      const supabase = createClientForAuthActions()
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            full_name: validatedData.name,
            name: validatedData.name,
            phone: validatedData.phone,
          },
        },
      })

      if (signUpError) {
        logger.warn('Supabase signUp error', { message: signUpError.message, status: signUpError.status })
        return Response.json(
          { error: supabaseAuthErrorMessage(signUpError) },
          { status: 400 }
        )
      }

      const supabaseUser = signUpData?.user
      if (!supabaseUser?.id) {
        return Response.json(
          { error: 'فشل إنشاء الحساب. يرجى المحاولة لاحقاً.' },
          { status: 500 }
        )
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10)
      try {
        const user = await prisma.user.create({
          data: {
            id: supabaseUser.id,
            name: validatedData.name,
            email: validatedData.email,
            phone: validatedData.phone,
            password: hashedPassword,
            role: 'CLIENT',
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        })
        return Response.json({ success: true, user })
      } catch (prismaErr) {
        if (prismaErr && typeof prismaErr === 'object' && 'code' in prismaErr && prismaErr.code === 'P2002') {
          return Response.json(
            { error: 'البريد الإلكتروني أو رقم الجوال مستخدم بالفعل' },
            { status: 400 }
          )
        }
        throw prismaErr
      }
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10)
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        password: hashedPassword,
        role: 'CLIENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    })

    return Response.json({
      success: true,
      user,
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
