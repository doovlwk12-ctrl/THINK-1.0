/**
 * Minimal GET: list messages for an order. Alternative to /api/messages/[orderId] to avoid ESM issues.
 * GET /api/chat/messages?orderId=xxx
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiAuth } from '@/lib/getApiAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const auth = await getApiAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    const orderId = request.nextUrl.searchParams.get('orderId')?.trim() ?? ''
    if (!orderId) {
      return NextResponse.json({ success: true, messages: [] }, { status: 200 })
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, clientId: true, engineerId: true },
    })
    if (!order) {
      return NextResponse.json({ success: true, messages: [] }, { status: 200 })
    }
    if (auth.role !== 'ADMIN') {
      if (auth.role === 'ENGINEER' && order.engineerId !== auth.userId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
      if (auth.role === 'CLIENT' && order.clientId !== auth.userId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
      }
    }
    const rows = await prisma.message.findMany({
      where: { orderId },
      include: { sender: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const messages = rows.map((m) => ({
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
    return NextResponse.json({ success: true, messages })
  } catch {
    return NextResponse.json(
      { success: false, error: 'تعذر تحميل المحادثة. تحقق من الاتصال وأعد المحاولة.' },
      { status: 503 }
    )
  }
}
