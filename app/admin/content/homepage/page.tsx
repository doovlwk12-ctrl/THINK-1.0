'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { FileText, Plus, Trash2, Layout, HelpCircle, Megaphone, Share2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

const textareaClass =
  'w-full px-4 py-2.5 border-2 border-greige/50 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-800 text-charcoal dark:text-cream placeholder:text-blue-gray/60 dark:placeholder:text-greige/60 min-h-[80px] resize-y focus:ring-2 focus:ring-rocky-blue focus:border-rocky-blue transition-all text-start'

type SocialType = 'instagram' | 'snapchat' | 'x' | 'whatsapp' | 'linkedin'

interface HomepageContentPayload {
  hero?: { title: string; subtitle: string }
  faq?: { sectionTitle: string; items: Array<{ question: string; answer: string }> }
  cta?: { badge: string; title: string; subtitle: string; paragraph: string; features: Array<{ title: string; desc: string }> }
  footer?: { email: string; phone: string; copyright: string; socialLinks: Array<{ type: SocialType; url: string; visible: boolean }> }
}

const SOCIAL_TYPE_LABELS: Record<string, string> = {
  instagram: 'انستقرام',
  snapchat: 'سناب شات',
  x: 'منصة X',
  whatsapp: 'واتساب',
  linkedin: 'لينكدإن',
}

const SOCIAL_TYPES = ['instagram', 'snapchat', 'x', 'whatsapp', 'linkedin'] as const

const DEFAULT: HomepageContentPayload = {
  hero: {
    title: 'حوّل احتياجاتك إلى مخطط معماري مدروس',
    subtitle: 'تصميم تخطيطي مبدئي مخصص حسب أرضك واحتياجاتك. نساعدك على اتخاذ قرارات صحيحة منذ البداية.',
  },
  faq: {
    sectionTitle: 'الأسئلة الشائعة',
    items: [
      { question: 'ما هي الباقات المتاحة لتصميم الفلل؟', answer: 'نوفر ثلاث باقات رئيسية...' },
      { question: 'كيف يمكنني البدء في مشروع تصميم؟', answer: 'ابدأ باختيار الباقة المناسبة...' },
      { question: 'هل يمكنني طلب تعديلات على التصميم؟', answer: 'نعم، عدد التعديلات يعتمد على الباقة...' },
      { question: 'ما هي المدة الزمنية المتوقعة للتسليم؟', answer: 'المدة تعتمد على الباقة المختارة...' },
      { question: 'هل توفرون خدمة الإشراف الهندسي؟', answer: 'نعم، يمكن توفير خدمة الإشراف...' },
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

export default function AdminHomepageContentPage() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<HomepageContentPayload>(DEFAULT)

  const fetchContent = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; content: HomepageContentPayload }>('/admin/content/homepage')
      if (result.success && result.content) {
        setForm({
          hero: result.content.hero ?? DEFAULT.hero,
          faq: result.content.faq ?? DEFAULT.faq,
          cta: result.content.cta ?? DEFAULT.cta,
          footer: result.content.footer ?? DEFAULT.footer,
        })
      }
    } catch {
      toast.error('فشل تحميل المحتوى')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      fetchContent()
    }
  }, [status, session, router, fetchContent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await apiClient.put<{ success: boolean }>('/admin/content/homepage', form)
      if (result.success) {
        toast.success('تم حفظ محتوى الصفحة الرئيسية')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل الحفظ'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const updateHero = (key: 'title' | 'subtitle', value: string) =>
    setForm((f) => ({ ...f, hero: { ...(f.hero ?? DEFAULT.hero!), [key]: value } }))
  const updateFaq = (key: 'sectionTitle', value: string) =>
    setForm((f) => ({ ...f, faq: { ...(f.faq ?? DEFAULT.faq!), [key]: value } }))
  const updateFaqItem = (index: number, key: 'question' | 'answer', value: string) =>
    setForm((f) => {
      const items = [...(f.faq?.items ?? [])]
      if (!items[index]) return f
      items[index] = { ...items[index], [key]: value }
      return { ...f, faq: { ...(f.faq ?? DEFAULT.faq!), items } }
    })
  const addFaqItem = () =>
    setForm((f) => ({
      ...f,
      faq: {
        ...(f.faq ?? DEFAULT.faq!),
        items: [...(f.faq?.items ?? []), { question: '', answer: '' }],
      },
    }))
  const removeFaqItem = (index: number) =>
    setForm((f) => ({
      ...f,
      faq: {
        ...(f.faq ?? DEFAULT.faq!),
        items: (f.faq?.items ?? []).filter((_, i) => i !== index),
      },
    }))

  const updateCta = (key: keyof NonNullable<HomepageContentPayload['cta']>, value: string) =>
    setForm((f) => ({ ...f, cta: { ...(f.cta ?? DEFAULT.cta!), [key]: value } }))
  const updateCtaFeature = (index: number, key: 'title' | 'desc', value: string) =>
    setForm((f) => {
      const features = [...(f.cta?.features ?? [])]
      if (!features[index]) return f
      features[index] = { ...features[index], [key]: value }
      return { ...f, cta: { ...(f.cta ?? DEFAULT.cta!), features } }
    })

  const updateFooter = (key: 'email' | 'phone' | 'copyright', value: string) =>
    setForm((f) => ({ ...f, footer: { ...(f.footer ?? DEFAULT.footer!), [key]: value } }))
  const updateSocialLink = (index: number, key: 'type' | 'url' | 'visible', value: string | boolean) =>
    setForm((f) => {
      const socialLinks = [...(f.footer?.socialLinks ?? [])]
      if (!socialLinks[index]) return f
      if (key === 'visible') socialLinks[index].visible = value as boolean
      else if (key === 'type') socialLinks[index].type = value as (typeof SOCIAL_TYPES)[number]
      else socialLinks[index].url = value as string
      return { ...f, footer: { ...(f.footer ?? DEFAULT.footer!), socialLinks } }
    })
  const addSocialLink = () =>
    setForm((f) => ({
      ...f,
      footer: {
        ...(f.footer ?? DEFAULT.footer!),
        socialLinks: [...(f.footer?.socialLinks ?? []), { type: 'instagram', url: '', visible: true }],
      },
    }))
  const removeSocialLink = (index: number) =>
    setForm((f) => ({
      ...f,
      footer: {
        ...(f.footer ?? DEFAULT.footer!),
        socialLinks: (f.footer?.socialLinks ?? []).filter((_, i) => i !== index),
      },
    }))

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center overflow-hidden">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <BackButton href="/admin/dashboard" label="العودة للوحة التحكم" />
            <h1 className="text-xl sm:text-2xl font-bold text-charcoal dark:text-cream flex items-center gap-2">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-rocky-blue" aria-hidden />
              إدارة محتوى الصفحة الرئيسية
            </h1>
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-rocky-blue dark:text-rocky-blue-300 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            معاينة الصفحة الرئيسية
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Hero */}
          <Card className="dark:bg-charcoal-800 dark:border-charcoal-600 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-charcoal dark:text-cream mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-rocky-blue" aria-hidden />
              قسم الهيرو
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">العنوان الرئيسي</label>
                <Input
                  value={form.hero?.title ?? ''}
                  onChange={(e) => updateHero('title', e.target.value)}
                  placeholder="حوّل احتياجاتك إلى مخطط معماري مدروس"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">العنوان الفرعي</label>
                <textarea
                  value={form.hero?.subtitle ?? ''}
                  onChange={(e) => updateHero('subtitle', e.target.value)}
                  placeholder="تصميم تخطيطي مبدئي..."
                  className={textareaClass}
                />
              </div>
            </div>
          </Card>

          {/* FAQ */}
          <Card className="dark:bg-charcoal-800 dark:border-charcoal-600 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-charcoal dark:text-cream mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-rocky-blue" aria-hidden />
              الأسئلة الشائعة
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">عنوان القسم</label>
                <Input
                  value={form.faq?.sectionTitle ?? ''}
                  onChange={(e) => updateFaq('sectionTitle', e.target.value)}
                  placeholder="الأسئلة الشائعة"
                />
              </div>
              {(form.faq?.items ?? []).map((item, index) => (
                <div key={index} className="p-4 bg-greige/10 dark:bg-charcoal-700 rounded-lg border border-greige/30 dark:border-charcoal-600 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-charcoal dark:text-cream">عنصر {index + 1}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => removeFaqItem(index)} aria-label="حذف السؤال">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    value={item.question}
                    onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                    placeholder="السؤال"
                  />
                  <textarea
                    value={item.answer}
                    onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                    placeholder="الجواب"
                    className={`${textareaClass} min-h-[60px]`}
                  />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addFaqItem}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة سؤال
              </Button>
            </div>
          </Card>

          {/* CTA */}
          <Card className="dark:bg-charcoal-800 dark:border-charcoal-600 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-charcoal dark:text-cream mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-rocky-blue" aria-hidden />
              قسم خذ قرارك بثقة (CTA)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">نص الشارة</label>
                <Input value={form.cta?.badge ?? ''} onChange={(e) => updateCta('badge', e.target.value)} placeholder="ابدأ الآن" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">العنوان الرئيسي</label>
                <Input value={form.cta?.title ?? ''} onChange={(e) => updateCta('title', e.target.value)} placeholder="خذ قرارك بثقة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">العنوان الفرعي</label>
                <Input value={form.cta?.subtitle ?? ''} onChange={(e) => updateCta('subtitle', e.target.value)} placeholder="وابدأ بتصميم منزلك..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">الفقرة</label>
                <textarea
                  value={form.cta?.paragraph ?? ''}
                  onChange={(e) => updateCta('paragraph', e.target.value)}
                  placeholder="لا تبدأ البناء..."
                  className={textareaClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">البطاقات الثلاث</label>
                <div className="space-y-3">
                  {(form.cta?.features ?? []).map((feat, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Input
                        value={feat.title}
                        onChange={(e) => updateCtaFeature(index, 'title', e.target.value)}
                        placeholder="العنوان"
                        className="flex-1 min-w-0"
                      />
                      <Input
                        value={feat.desc}
                        onChange={(e) => updateCtaFeature(index, 'desc', e.target.value)}
                        placeholder="الوصف"
                        className="flex-1 min-w-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <Card className="dark:bg-charcoal-800 dark:border-charcoal-600 p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-charcoal dark:text-cream mb-4 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-rocky-blue" aria-hidden />
              الفوتر
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">البريد الإلكتروني</label>
                <Input value={form.footer?.email ?? ''} onChange={(e) => updateFooter('email', e.target.value)} placeholder="info@..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">رقم الهاتف</label>
                <Input value={form.footer?.phone ?? ''} onChange={(e) => updateFooter('phone', e.target.value)} placeholder="+966 ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">نص حقوق النشر</label>
                <Input value={form.footer?.copyright ?? ''} onChange={(e) => updateFooter('copyright', e.target.value)} placeholder="منصة فكرة. جميع الحقوق محفوظة." />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">روابط السوشيال ميديا</label>
                <div className="space-y-3">
                  {(form.footer?.socialLinks ?? []).map((link, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 p-3 bg-greige/10 dark:bg-charcoal-700 rounded-lg">
                      <select
                        value={link.type}
                        onChange={(e) => updateSocialLink(index, 'type', e.target.value as (typeof SOCIAL_TYPES)[number])}
                        className="w-full sm:w-auto px-3 py-2.5 border-2 border-greige/50 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-800 text-charcoal dark:text-cream min-w-0"
                      >
                        {SOCIAL_TYPES.map((t) => (
                          <option key={t} value={t}>{SOCIAL_TYPE_LABELS[t] ?? t}</option>
                        ))}
                      </select>
                      <Input
                        value={link.url}
                        onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                        placeholder="رابط الملف الشخصي"
                        className="flex-1 min-w-0 w-full sm:min-w-[180px]"
                      />
                      <label className="flex items-center gap-2 text-sm text-charcoal dark:text-cream shrink-0">
                        <input
                          type="checkbox"
                          checked={link.visible}
                          onChange={(e) => updateSocialLink(index, 'visible', e.target.checked)}
                          className="rounded border-greige/50 dark:border-charcoal-600 w-4 h-4"
                        />
                        إظهار
                      </label>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeSocialLink(index)} className="shrink-0" aria-label="حذف الرابط">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addSocialLink} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 ml-2 inline" />
                    إضافة رابط
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="pt-2">
            <Button type="submit" disabled={saving} className="w-full sm:max-w-xs">
              {saving ? 'جاري الحفظ...' : 'حفظ المحتوى'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
