/**
 * WhatsApp messaging service
 * Helper functions to generate WhatsApp message links with pre-filled messages
 */

import { prisma } from './prisma'

/**
 * Generate WhatsApp URL with pre-filled message
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  // Remove any non-digit characters except + at the start
  const cleanPhone = phone.replace(/[^\d+]/g, '')
  // Ensure phone starts with country code (assume Saudi Arabia +966 if starts with 0)
  const formattedPhone = cleanPhone.startsWith('0')
    ? `966${cleanPhone.substring(1)}`
    : cleanPhone.startsWith('+')
    ? cleanPhone.substring(1)
    : cleanPhone.startsWith('966')
    ? cleanPhone
    : `966${cleanPhone}`
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)
  
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

/**
 * Template: Plan sent to client (initial plan)
 */
export function getPlanSentTemplate(
  clientName: string,
  orderNumber: string,
  platformUrl: string
): string {
  return `مرحباً ${clientName} 👋

تم رفع المخطط الخاص بطلبك #${orderNumber} على منصة فكرة 🎉

يمكنك الآن:
✅ عرض المخطط وتحميله
✅ طلب تعديلات إذا لزم الأمر
✅ التواصل مع المهندس عبر المحادثة

رابط الطلب:
${platformUrl}

شكراً لثقتك بنا 🙏`
}

/**
 * Template: Revised plan sent to client
 */
export function getRevisedPlanSentTemplate(
  clientName: string,
  orderNumber: string,
  platformUrl: string,
  revisionNumber?: number
): string {
  const revisionText = revisionNumber 
    ? `التعديل ${revisionNumber === 1 ? 'الأول' : revisionNumber === 2 ? 'الثاني' : revisionNumber === 3 ? 'الثالث' : `رقم ${revisionNumber}`}`
    : 'التعديل المطلوب'
  
  return `مرحباً ${clientName} 👋

تم رفع المخطط المعدل (${revisionText}) لطلبك #${orderNumber} على منصة فكرة ✨

يمكنك الآن:
✅ عرض المخطط المعدل وتحميله
✅ مراجعة التعديلات المطبقة
✅ طلب تعديلات إضافية إذا لزم الأمر
✅ التواصل مع المهندس عبر المحادثة

رابط الطلب:
${platformUrl}

نتمنى أن يكون المخطط حسب توقعاتك 🎯`
}

/**
 * Send WhatsApp message link for plan sent
 */
export async function sendWhatsAppPlanSent(
  orderId: string,
  clientId: string,
  isRevision: boolean = false
): Promise<string | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!order || !order.client) {
      console.error('Order or client not found')
      return null
    }

    if (!order.client.phone) {
      console.error('Client phone number not found')
      return null
    }

    // Get platform URL (you can configure this in environment variables)
    const platformUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`
      : `https://fekra.com/orders/${orderId}`

    // Get revision number if it's a revision
    let revisionNumber: number | undefined
    if (isRevision) {
      const revisionCount = await prisma.revisionRequest.count({
        where: {
          orderId,
          status: 'completed',
        },
      })
      revisionNumber = revisionCount
    }

    // Generate message template
    const message = isRevision
      ? getRevisedPlanSentTemplate(
          order.client.name,
          order.orderNumber,
          platformUrl,
          revisionNumber
        )
      : getPlanSentTemplate(
          order.client.name,
          order.orderNumber,
          platformUrl
        )

    // Generate WhatsApp URL
    const whatsappUrl = generateWhatsAppUrl(order.client.phone, message)

    return whatsappUrl
  } catch (error) {
    console.error('Error generating WhatsApp URL:', error)
    return null
  }
}

/**
 * Check if order has previous plans (to determine if it's a revision)
 */
export async function isOrderRevision(orderId: string): Promise<boolean> {
  try {
    const planCount = await prisma.plan.count({
      where: {
        orderId,
        isActive: false, // Previous plans are inactive
      },
    })
    return planCount > 0
  } catch (error) {
    console.error('Error checking if order is revision:', error)
    return false
  }
}

/**
 * Generate WhatsApp URL for plan uploaded (before sending)
 * This is used right after upload, before sending to client
 */
export async function generateWhatsAppPlanUploadedUrl(
  orderId: string,
  _clientId: string
): Promise<string | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    })

    if (!order || !order.client) {
      console.error('Order or client not found')
      return null
    }

    if (!order.client.phone) {
      console.error('Client phone number not found')
      return null
    }

    // Get platform URL
    const platformUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`
      : `https://fekra.com/orders/${orderId}`

    // Check if it's a revision
    const isRevision = await isOrderRevision(orderId)
    
    // Generate message template
    const message = isRevision
      ? `مرحباً ${order.client.name} 👋

تم رفع مخطط معدل جديد لطلبك #${order.orderNumber} على منصة فكرة ✨

سيتم مراجعته وإرساله لك قريباً.

رابط الطلب:
${platformUrl}

شكراً لثقتك بنا 🙏`
      : `مرحباً ${order.client.name} 👋

تم رفع مخطط جديد لطلبك #${order.orderNumber} على منصة فكرة 🎉

سيتم مراجعته وإرساله لك قريباً.

رابط الطلب:
${platformUrl}

شكراً لثقتك بنا 🙏`

    // Generate WhatsApp URL
    const whatsappUrl = generateWhatsAppUrl(order.client.phone, message)

    return whatsappUrl
  } catch (error) {
    console.error('Error generating WhatsApp URL:', error)
    return null
  }
}
