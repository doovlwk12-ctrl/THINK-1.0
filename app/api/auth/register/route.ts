import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if user exists
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

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        password: hashedPassword,
        role: 'CLIENT'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    })

    return Response.json({
      success: true,
      user
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
