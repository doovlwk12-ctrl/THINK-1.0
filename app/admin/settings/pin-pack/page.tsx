'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Settings } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface PinPackSettings {
  pinPackPrice: number
  pinPackOldPrice: number | null
  pinPackDiscountPercent: number | null
  messageWhen1Left: string | null
  messageWhen0Left: string | null
}

/** Form state allows empty string for price so user can clear/type 0. */
type PinPackFormState = Omit<PinPackSettings, 'pinPackPrice'> & { pinPackPrice: number | '' }

/** Compute discount % from old and current price. Returns null if not applicable. */
function computeDiscountPercent(oldPrice: number, currentPrice: number): number | null {
  if (oldPrice <= 0 || currentPrice > oldPrice) return null
  const pct = ((oldPrice - currentPrice) / oldPrice) * 100
  return Math.round(Math.max(0, Math.min(100, pct)))
}

export default function AdminPinPackSettingsPage() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<PinPackFormState>({
    pinPackPrice: 0,
    pinPackOldPrice: null,
    pinPackDiscountPercent: null,
    messageWhen1Left: null,
    messageWhen0Left: null,
  })

  const fetchSettings = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; pinPack: PinPackSettings }>('/admin/settings/pin-pack')
      if (result.success && result.pinPack) {
        setForm({
          pinPackPrice: result.pinPack.pinPackPrice ?? 0,
          pinPackOldPrice: result.pinPack.pinPackOldPrice ?? null,
          pinPackDiscountPercent: result.pinPack.pinPackDiscountPercent ?? null,
          messageWhen1Left: result.pinPack.messageWhen1Left ?? null,
          messageWhen0Left: result.pinPack.messageWhen0Left ?? null,
        })
      }
    } catch {
      toast.error('فشل تحميل إعدادات مجموعة الدبابيس')
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
      fetchSettings()
    }
  }, [status, session, router, fetchSettings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await apiClient.put<{ success: boolean }>('/admin/settings/pin-pack', {
        pinPackPrice: form.pinPackPrice === '' ? 0 : Number(form.pinPackPrice),
        pinPackOldPrice: form.pinPackOldPrice != null ? Number(form.pinPackOldPrice) : null,
        pinPackDiscountPercent: form.pinPackDiscountPercent != null ? Number(form.pinPackDiscountPercent) : null,
        messageWhen1Left: form.messageWhen1Left && form.messageWhen1Left.trim() ? form.messageWhen1Left.trim() : null,
        messageWhen0Left: form.messageWhen0Left && form.messageWhen0Left.trim() ? form.messageWhen0Left.trim() : null,
      })
      if (result.success) {
        toast.success('تم حفظ إعدادات مجموعة الدبابيس')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل الحفظ'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <BackButton href="/admin/dashboard" label="العودة للوحة التحكم" />
        <h1 className="text-2xl font-bold text-charcoal dark:text-cream mt-4 mb-6 flex items-center gap-2">
          <Settings className="w-7 h-7" />
          إعدادات مجموعة الدبابيس
        </h1>

        <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
          <p className="text-sm text-blue-gray dark:text-greige mb-4 p-3 bg-greige/10 dark:bg-charcoal-700/50 rounded-lg border border-greige/30 dark:border-charcoal-600">
            تغيير الإعدادات ينطبق على المشتريات الجديدة من مجموعات الدبابيس فقط. الطلبات والمدفوعات الحالية تحتفظ بأسعارها.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">سعر مجموعة الدبابيس (ريال)</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.pinPackPrice === '' ? '' : form.pinPackPrice}
                onChange={(e) => {
                  const raw = e.target.value
                  const next: number | '' = raw === '' ? '' : Number(raw)
                  setForm((f) => {
                    const nextForm = { ...f, pinPackPrice: next }
                    const current = next === '' ? 0 : next
                    const oldVal = f.pinPackOldPrice ?? 0
                    if (oldVal > 0 && current <= oldVal) {
                      const computed = computeDiscountPercent(oldVal, current)
                      if (computed != null) nextForm.pinPackDiscountPercent = computed
                    }
                    return nextForm
                  })
                }}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">السعر القديم للعرض (ريال) – اختياري</label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.pinPackOldPrice ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  const nextOld = raw === '' ? null : Number(raw)
                  setForm((f) => {
                    const nextForm = { ...f, pinPackOldPrice: nextOld }
                    const current = f.pinPackPrice === '' ? 0 : Number(f.pinPackPrice)
                    const oldVal = nextOld ?? 0
                    if (oldVal > 0 && current <= oldVal) {
                      const computed = computeDiscountPercent(oldVal, current)
                      if (computed != null) nextForm.pinPackDiscountPercent = computed
                    }
                    return nextForm
                  })
                }}
                placeholder="اتركه فارغاً إن لم يكن هناك سعر قديم"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">نسبة الخصم (%) – اختياري</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.pinPackDiscountPercent ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pinPackDiscountPercent: e.target.value === '' ? null : Number(e.target.value) }))}
                placeholder="مثال: 10"
              />
              {(() => {
                const current = form.pinPackPrice === '' ? 0 : Number(form.pinPackPrice)
                const oldPrice = form.pinPackOldPrice ?? 0
                if (oldPrice > 0 && current <= oldPrice && current >= 0) {
                  const diff = oldPrice - current
                  return (
                    <p className="text-sm text-blue-gray dark:text-greige mt-2">
                      الفرق: {diff.toFixed(2)} ريال
                    </p>
                  )
                }
                return null
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">رسالة عند بقاء دبوس واحد (1/6)</label>
              <textarea
                value={form.messageWhen1Left ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, messageWhen1Left: e.target.value || null }))}
                placeholder="مثال: يمكنك الحصول على مجموعة إضافية بسعر..."
                className="w-full min-h-[80px] p-3 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-1">رسالة عند انتهاء الدبابيس (0/6)</label>
              <textarea
                value={form.messageWhen0Left ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, messageWhen0Left: e.target.value || null }))}
                placeholder="مثال: انتهت دبابيس هذه المجموعة. اشترِ مجموعة جديدة..."
                className="w-full min-h-[80px] p-3 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
