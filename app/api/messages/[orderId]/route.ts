import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitizeText'
import { notifyMessageReceived } from '@/lib/notifications'
import { isOrderExpired } from '@/lib/utils'

const ALLOW_HEADERS = { Allow: 'GET, POST, OPTIONS' } as const

/** Force dynamic so GET/POST are always available on Vercel (avoids 405 for POST). */
export const dynamic = 'force-dynamic'
/** Use Node runtime so both GET and POST are correctly routed (avoids 405 on serverless). */
export const runtime = 'nodejs'

const postMessageSchema = z.object({
  content: z.string().min(1, 'محتوى الرسالة مطلوب'),
})

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: ALLOW_HEADERS })
}

const FALLBACK_503 = { success: false, error: 'تعذر تحميل المحادثة. تحقق من الاتصال وأعد المحاولة.' as const }
const FALLBACK_503_HEADERS = { status: 503 as const, headers: ALLOW_HEADERS }

const SKIP_MESSAGES_AUTH = process.env.SKIP_MESSAGES_AUTH === 'true'

export async function GET(
  request: NextRequest,
  context?: { params?: Promise<{ orderId: string }> | { orderId: string } }
): Promise<Response> {
  try {
    // استخراج orderId كـ String نقي من المسار (CUID)
    const rawParams = context?.params
    type ParamsBox = { orderId?: string }
    const resolvedParams: ParamsBox =
      rawParams != null && typeof (rawParams as Promise<unknown>)?.then === 'function'
        ? await (rawParams as Promise<ParamsBox>).catch((): ParamsBox => ({}))
        : (rawParams ?? {}) as ParamsBox
    const orderId = resolvedParams.orderId != null ? String(resolvedParams.orderId).trim() : ''
    console.log('Fetching messages for order:', orderId)

    // حماية: orderId غير صالح أو طلب غير موجود → 200 مع مصفوفة فارغة (بدون 500 أو 404)
    if (!orderId) {
      return Response.json({ success: true, messages: [] }, { status: 200, headers: ALLOW_HEADERS })
    }

    let auth: { userId: string; role: string }
    if (SKIP_MESSAGES_AUTH) {
      auth = { userId: '', role: 'ADMIN' }
    } else {
      const result = await requireAuth(request)
      if (result instanceof NextResponse) return result
      auth = result.auth
    }

    let order: { id: string; clientId: string; engineerId: string | null } | null = null
    try {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, clientId: true, engineerId: true },
      })
    } catch (orderErr) {
      console.error('[messages GET] findUnique order failed', orderErr)
      return Response.json({ success: true, messages: [] }, { status: 200, headers: ALLOW_HEADERS })
    }

    if (!order) {
      return Response.json({ success: true, messages: [] }, { status: 200, headers: ALLOW_HEADERS })
    }

    if (!SKIP_MESSAGES_AUTH) {
      if (auth.role === 'ADMIN') {
        // allow
      } else if (auth.role === 'ENGINEER') {
        if (order.engineerId !== auth.userId) {
          return Response.json(
            { error: 'غير مصرح - الطلب غير مخصص لك' },
            { status: 403, headers: ALLOW_HEADERS }
          )
        }
      } else {
        if (order.clientId !== auth.userId) {
          return Response.json(
            { error: 'غير مصرح' },
            { status: 403, headers: ALLOW_HEADERS }
          )
        }
      }
    }

    // فلترة دقيقة بـ orderId (CUID) — الربط عبر حقل orderId في جدول Message
    let messages: Awaited<ReturnType<typeof prisma.message.findMany>>
    try {
      messages = await prisma.message.findMany({
        where: { orderId },
        include: { sender: true },
        orderBy: { createdAt: 'asc' },
      })
    } catch (findErr) {
      console.error('[messages GET] findMany failed', findErr)
      return Response.json({ success: true, messages: [] }, { status: 200, headers: ALLOW_HEADERS })
    }

    // Mark messages as read (non-blocking); تخطي عند تعطيل Auth
    if (auth.userId) {
      prisma.message.updateMany({
        where: {
          orderId,
          senderId: { not: auth.userId },
          isRead: false
        },
        data: { isRead: true }
      }).catch((err: unknown) => {
        logger.error('messages_mark_read_failed', { orderId }, err instanceof Error ? err : new Error(String(err)))
      })
    }

    // Safe: handle empty or invalid data (never crash on empty)
    const list = Array.isArray(messages) ? messages : []

    // Serialize: sender من include:true قد يحتوي حقول إضافية — نُخرج للمستخدم id, name, role فقط
    const serialized = list.map((m) => ({
      id: m.id,
      orderId: m.orderId,
      senderId: m.senderId,
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      sender: {
        id: String(m.sender?.id ?? ''),
        name: String(m.sender?.name ?? ''),
        role: String(m.sender?.role ?? ''),
      },
    }))

    return Response.json(
      {
        success: true,
        messages: serialized,
        ...(serialized.length > 0 && {
          cursor: serialized[serialized.length - 1]?.createdAt,
        }),
      },
      { headers: ALLOW_HEADERS }
    )
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const errWithCode = error as { code?: string; meta?: unknown }
    console.error('[messages GET]', err.message, {
      code: errWithCode?.code,
      meta: errWithCode?.meta,
      name: err.name,
    })
    if (err.stack) console.error('[messages GET] stack:', err.stack)
    try {
      logger.error('messages_get_error', { errorMessage: err.message }, err)
    } catch {
      // ignore
    }
    try {
      const res = handleApiError(error)
      if (res.status >= 500) return Response.json(FALLBACK_503, FALLBACK_503_HEADERS)
      const headers = new Headers(res.headers)
      headers.set('Allow', ALLOW_HEADERS.Allow)
      return new NextResponse(res.body, { status: res.status, headers })
    } catch {
      return Response.json(FALLBACK_503, FALLBACK_503_HEADERS)
    }
  }
  } catch (outer: unknown) {
    console.error('[messages GET outer]', outer instanceof Error ? outer.message : String(outer))
    return Response.json(FALLBACK_503, FALLBACK_503_HEADERS)
  }
}

export async function POST(
  request: NextRequest,
  context?: { params?: Promise<{ orderId: string }> | { orderId: string } }
) {
  try {
    const result = await requireAuth(request)
    if (result instanceof NextResponse) return result
    const { auth } = result

    // استخراج orderId كـ String نقي (CUID) من المسار
    const rawParams = context?.params
    type ParamsBox = { orderId?: string }
    const resolvedParams: ParamsBox =
      rawParams != null && typeof (rawParams as Promise<unknown>)?.then === 'function'
        ? await (rawParams as Promise<ParamsBox>).catch((): ParamsBox => ({}))
        : (rawParams ?? {}) as ParamsBox
    const orderId = resolvedParams.orderId != null ? String(resolvedParams.orderId).trim() : ''
    if (!orderId) {
      return Response.json({ error: 'معرف الطلب مطلوب' }, { status: 400, headers: ALLOW_HEADERS })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'تنسيق الطلب غير صالح' }, { status: 400, headers: ALLOW_HEADERS })
    }
    const { content } = postMessageSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, clientId: true, engineerId: true, deadline: true, status: true },
    })

    if (!order) {
      return Response.json(
        { error: 'الطلب غير موجود' },
        { status: 404, headers: ALLOW_HEADERS }
      )
    }

    if (auth.role === 'ADMIN') {
      // allow
    } else if (auth.role === 'ENGINEER') {
      if (order.engineerId !== auth.userId) {
        return Response.json(
          { error: 'غير مصرح - الطلب غير مخصص لك' },
          { status: 403, headers: ALLOW_HEADERS }
        )
      }
    } else {
      if (order.clientId !== auth.userId) {
        return Response.json(
          { error: 'غير مصرح' },
          { status: 403, headers: ALLOW_HEADERS }
        )
      }
    }

    if (auth.role === 'CLIENT' && isOrderExpired(order.deadline) && order.status === 'ARCHIVED') {
      return Response.json(
        { error: 'انتهى وقت الطلب. يمكنك شراء تمديد لإعادة تفعيل المحادثة' },
        { status: 400, headers: ALLOW_HEADERS }
      )
    }

    const sanitizedContent = sanitizeText(content)

    const message = await prisma.message.create({
      data: {
        orderId,
        senderId: auth.userId,
        content: sanitizedContent
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    const recipientId = order.clientId === auth.userId
      ? order.engineerId
      : order.clientId

    if (recipientId) {
      notifyMessageReceived(orderId, recipientId, message.sender.name).catch(
        (error: unknown) => {
          logger.error('Failed to send notification', {}, error instanceof Error ? error : new Error(String(error)))
        }
      )
    }

    logger.info('message_sent', { orderId, userId: auth.userId, messageId: message.id })
    return Response.json(
      { success: true, message },
      { headers: ALLOW_HEADERS }
    )
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const errWithCode = error as { code?: string; meta?: unknown }
    console.error('[messages POST]', err.message, {
      code: errWithCode?.code,
      meta: errWithCode?.meta,
      name: err.name,
    })
    if (err.stack) console.error('[messages POST] stack:', err.stack)
    try {
      const res = handleApiError(error)
      if (res.status >= 500) throw new Error('use 503')
      if (ALLOW_HEADERS.Allow) res.headers.set('Allow', ALLOW_HEADERS.Allow)
      return res
    } catch {
      return Response.json(
        { success: false, error: 'تعذر إرسال الرسالة. تحقق من الاتصال وأعد المحاولة.' },
        { status: 503, headers: ALLOW_HEADERS }
      )
    }
  }
}
