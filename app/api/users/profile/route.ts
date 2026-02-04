import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'
import bcrypt from 'bcryptjs'
import { getApiAuth } from '@/lib/getApiAuth'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون على الأقل حرفين').optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
  phone: z.string().min(10, 'رقم الجوال يجب أن يكون على الأقل 10 أرقام').max(15, 'رقم الجوال طويل جداً').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'كلمة المرور الجديدة يجب أن تكون على الأقل 6 أحرف').optional(),
})

// GET - Get current user profile
export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuth(request)

    if (!auth) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return Response.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const auth = await getApiAuth(request)

    if (!auth) {
      return Response.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // NextAuth + Prisma
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
    })

    if (!currentUser) {
      return Response.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      )
    }

    // طلب كلمة المرور الحالية فقط عند تغيير البريد أو الجوال فعلياً (ليس عند تغيير الاسم فقط)
    const emailChanged = validatedData.email != null && String(validatedData.email).trim() !== String(currentUser.email ?? '').trim()
    const phoneChanged = validatedData.phone != null && String(validatedData.phone).trim() !== String(currentUser.phone ?? '').trim()
    if (emailChanged || phoneChanged) {
      if (!validatedData.currentPassword || !String(validatedData.currentPassword).trim()) {
        return Response.json(
          { success: false, error: 'تغيير البريد أو رقم الجوال يتطلب إدخال كلمة المرور الحالية للتأكيد' },
          { status: 400 }
        )
      }
      const currentPasswordHash = currentUser.password
      if (!currentPasswordHash) {
        return Response.json(
          { success: false, error: 'لا يمكن التحقق من كلمة المرور' },
          { status: 400 }
        )
      }
      const isPasswordValid = await bcrypt.compare(
        validatedData.currentPassword,
        currentPasswordHash
      )
      if (!isPasswordValid) {
        return Response.json(
          { success: false, error: 'كلمة المرور الحالية غير صحيحة' },
          { status: 400 }
        )
      }
      const existingUser = await prisma.user.findFirst({
        where: {
          id: { not: auth.userId },
          OR: [
            ...(validatedData.email ? [{ email: validatedData.email }] : []),
            ...(validatedData.phone ? [{ phone: validatedData.phone }] : []),
          ],
        },
      })

      if (existingUser) {
        if (existingUser.email === validatedData.email) {
          return Response.json(
            { success: false, error: 'البريد الإلكتروني مستخدم بالفعل' },
            { status: 400 }
          )
        }
        if (existingUser.phone === validatedData.phone) {
          return Response.json(
            { success: false, error: 'رقم الجوال مستخدم بالفعل' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: {
      name?: string
      email?: string
      phone?: string
      password?: string
    } = {}

    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.phone) updateData.phone = validatedData.phone

    if (validatedData.newPassword) {
      if (!validatedData.currentPassword) {
        return Response.json(
          { success: false, error: 'يجب إدخال كلمة المرور الحالية لتغيير كلمة المرور' },
          { status: 400 }
        )
      }
      if (validatedData.newPassword === validatedData.currentPassword) {
        return Response.json(
          { success: false, error: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية' },
          { status: 400 }
        )
      }
      const hashForNewPassword = currentUser.password
      if (!hashForNewPassword) {
        return Response.json(
          { success: false, error: 'لا يمكن التحقق من كلمة المرور' },
          { status: 400 }
        )
      }
      const isPasswordValid = await bcrypt.compare(
        validatedData.currentPassword,
        hashForNewPassword
      )
      if (!isPasswordValid) {
        return Response.json(
          { success: false, error: 'كلمة المرور الحالية غير صحيحة' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(validatedData.newPassword, 10)
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { success: false, error: 'لم يتم تغيير أي بيانات' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return Response.json({
      success: true,
      message: 'تم تحديث البيانات بنجاح',
      user: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
