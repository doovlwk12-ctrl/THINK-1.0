import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    const body = await request.json()
    const validatedData = subscribeSchema.parse(body)

    // Store push subscription in user's record
    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        pushSubscription: JSON.stringify(validatedData.subscription),
      },
    })

    return Response.json({
      success: true,
      message: 'تم الاشتراك في الإشعارات بنجاح',
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
