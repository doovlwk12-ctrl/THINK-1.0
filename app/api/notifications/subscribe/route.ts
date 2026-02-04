import { NextRequest } from 'next/server'
import { getApiAuth } from '@/lib/getApiAuth'
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
    const auth = await getApiAuth(request)
    if (!auth) {
      return Response.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }

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
