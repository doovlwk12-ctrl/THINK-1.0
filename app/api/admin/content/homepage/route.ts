import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { handleApiError } from '@/lib/errors'

const SOCIAL_TYPES = ['instagram', 'snapchat', 'x', 'whatsapp', 'linkedin'] as const

const homepageContentSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string(),
  }).optional(),
  faq: z.object({
    sectionTitle: z.string(),
    items: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })),
  }).optional(),
  cta: z.object({
    badge: z.string(),
    title: z.string(),
    subtitle: z.string(),
    paragraph: z.string(),
    features: z.array(z.object({
      title: z.string(),
      desc: z.string(),
    })),
  }).optional(),
  footer: z.object({
    email: z.string(),
    phone: z.string(),
    copyright: z.string(),
    socialLinks: z.array(z.object({
      type: z.enum(SOCIAL_TYPES),
      url: z.string(), // allow empty or '#' placeholder; frontend can hide invalid links
      visible: z.boolean(),
    })),
  }).optional(),
})

export type HomepageContentPayload = z.infer<typeof homepageContentSchema>

function parseContent(content: string | null): HomepageContentPayload | null {
  if (!content) return null
  try {
    const parsed = JSON.parse(content) as unknown
    return homepageContentSchema.partial().parse(parsed)
  } catch {
    return null
  }
}

const DEFAULT_CONTENT: HomepageContentPayload = {
  hero: {
    title: 'حوّل احتياجاتك إلى مخطط معماري مدروس',
    subtitle: 'تصميم تخطيطي مبدئي مخصص حسب أرضك واحتياجاتك. نساعدك على اتخاذ قرارات صحيحة منذ البداية.',
  },
  faq: {
    sectionTitle: 'الأسئلة الشائعة',
    items: [
      { question: 'ما هي الباقات المتاحة لتصميم الفلل؟', answer: 'نوفر ثلاث باقات رئيسية: الباقة الأساسية للتصميم السريع، الباقة القياسية للتصميم الأدق، والباقة المميزة للتصميم الشامل مع جميع الخدمات.' },
      { question: 'كيف يمكنني البدء في مشروع تصميم؟', answer: 'ابدأ باختيار الباقة المناسبة، ثم قم بتعبئة نموذج بسيط عن أرضك واحتياجاتك، وسيتواصل معك المهندس المختص.' },
      { question: 'هل يمكنني طلب تعديلات على التصميم؟', answer: 'نعم، عدد التعديلات يعتمد على الباقة المختارة. يمكنك أيضاً شراء تعديلات إضافية إذا لزم الأمر.' },
      { question: 'ما هي المدة الزمنية المتوقعة للتسليم؟', answer: 'المدة تعتمد على الباقة المختارة، عادةً من 7 إلى 21 يوم عمل حسب تعقيد المشروع.' },
      { question: 'هل توفرون خدمة الإشراف الهندسي؟', answer: 'نعم، يمكن توفير خدمة الإشراف الهندسي كإضافة لضمان مطابقة التنفيذ للمخططات.' },
    ],
  },
  cta: {
    badge: 'ابدأ الآن',
    title: 'خذ قرارك بثقة',
    subtitle: 'وابدأ بتصميم منزلك اليوم للتنفيذ غداً',
    paragraph: 'لا تبدأ البناء قبل أن تتأكد من أن المخطط مناسب لك ولعائلتك.\nدع الخبرة الهندسية تساعدك على اتخاذ القرارات الصحيحة منذ البداية.',
    features: [
      { title: 'تعديلات مجانية', desc: 'حتى تصل للنتيجة المثالية' },
      { title: 'تسليم سريع', desc: 'من 7-21 يوم' },
      { title: 'جودة مضمونة', desc: 'تصاميم مدروسة ومعتمدة' },
    ],
  },
  footer: {
    email: 'info@fikra-platform.com',
    phone: '+966 50 000 0000',
    copyright: 'منصة فكرة. جميع الحقوق محفوظة.',
    socialLinks: [
      { type: 'x', url: '#', visible: true },
      { type: 'linkedin', url: '#', visible: true },
      { type: 'instagram', url: '#', visible: true },
    ],
  },
}

export async function GET(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    const row = await prisma.homepageContent.findFirst({ orderBy: { updatedAt: 'desc' } })
    const content = parseContent(row?.content ?? null)
    const merged = {
      hero: content?.hero ?? DEFAULT_CONTENT.hero,
      faq: content?.faq ?? DEFAULT_CONTENT.faq,
      cta: content?.cta ?? DEFAULT_CONTENT.cta,
      footer: content?.footer ?? DEFAULT_CONTENT.footer,
    }
    return Response.json({ success: true, content: merged })
  } catch (error: unknown) {
    // #region agent log
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
    fetch('http://127.0.0.1:7244/ingest/a8eee1e4-a2b5-45ab-8ecd-ef5f28c71af1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'admin/content/homepage/route.ts:GET:catch', message: 'GET error', data: { code, errorMessage: error instanceof Error ? error.message : String(error) }, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {})
    // #endregion
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const result = await requireAdmin(request)
    if (result instanceof NextResponse) return result
    const { auth: _auth } = result

    const body = await request.json() as unknown
    const data = homepageContentSchema.partial().parse(body)

    const row = await prisma.homepageContent.findFirst({ orderBy: { updatedAt: 'desc' } })
    const existing = parseContent(row?.content ?? null) ?? {}
    const merged = {
      ...existing,
      ...(data.hero != null && { hero: data.hero }),
      ...(data.faq != null && { faq: data.faq }),
      ...(data.cta != null && { cta: data.cta }),
      ...(data.footer != null && { footer: data.footer }),
    }

    const contentString = JSON.stringify(merged)
    if (row) {
      await prisma.homepageContent.update({
        where: { id: row.id },
        data: { content: contentString, updatedAt: new Date() },
      })
    } else {
      await prisma.homepageContent.create({
        data: { content: contentString },
      })
    }
    return Response.json({ success: true, content: merged })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
