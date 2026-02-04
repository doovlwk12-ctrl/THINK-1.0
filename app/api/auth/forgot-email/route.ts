import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const bodySchema = z.object({
  phone: z.string().min(10, 'رقم الجوال غير صحيح').max(15, 'رقم الجوال طويل جداً'),
})

/** إرجاع تلميح للبريد (أول حرف + *** + @ + النطاق) دون كشف البريد الكامل */
function maskEmail(email: string): string {
  const t = email.trim()
  if (!t || !t.includes('@')) return '***@***.***'
  const [local, domain] = t.split('@')
  if (!local?.length) return '***@' + domain
  const first = local[0]
  return first + '***@' + domain
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = bodySchema.parse(body)
    const normalizedPhone = phone.trim()

    const user = await prisma.user.findFirst({
      where: { phone: normalizedPhone },
      select: { email: true },
    })
    if (!user?.email) {
      return Response.json({ success: true, message: 'إذا كان الرقم مسجلاً، ستظهر تلميح البريد أدناه.' })
    }
    return Response.json({
      success: true,
      emailHint: maskEmail(user.email),
      message: 'تلميح البريد المرتبط برقمك:',
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}
