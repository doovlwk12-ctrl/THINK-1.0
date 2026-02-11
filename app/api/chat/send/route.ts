/**
 * Minimal POST: send a message. Alternative to /api/messages/[orderId] to avoid ESM issues.
 * POST /api/chat/send body: { orderId: string, content: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiAuth } from '@/lib/getApiAuth'
import { sanitizeText } from '@/lib/sanitizeText'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    let body: { orderId?: string; content?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'تنسيق الطلب غير صالح' }, { status: 400 })
    }
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : ''
    const rawContent = typeof body?.content === 'string' ? body.content : ''
    if (!orderId) {
      return NextResponse.json({ error: 'معرف الطلب مطلوب' }, { status: 400 })
    }
    if (!rawContent.trim()) {
      return NextResponse.json({ error: 'محتوى الرسالة مطلوب' }, { status: 400 })
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, clientId: true, engineerId: true, deadline: true, status: true },
    })
    if (!order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
    }
    if (auth.role !== 'ADMIN') {
      if (auth.role === 'ENGINEER' && order.engineerId !== auth.userId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
      if (auth.role === 'CLIENT' && order.clientId !== auth.userId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
    }
    const content = sanitizeText(rawContent)
    const message = await prisma.message.create({
      data: { orderId, senderId: auth.userId, content },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })
    const out = {
      id: message.id,
      orderId: message.orderId,
      senderId: message.senderId,
      content: message.content,
      isRead: message.isRead,
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : String(message.createdAt),
      sender: {
        id: String(message.sender?.id ?? ''),
        name: String(message.sender?.name ?? ''),
        role: String(message.sender?.role ?? ''),
      },
    }
    return NextResponse.json({ success: true, message: out }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'تعذر إرسال الرسالة. تحقق من الاتصال وأعد المحاولة.' },
      { status: 503 }
    )
  }
}
