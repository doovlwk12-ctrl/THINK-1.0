'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Edit, DollarSign, Hash } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Input } from '@/components/shared/Input'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface RevisionsPurchaseSettings {
  pricePerRevision: number
  maxRevisionsPerPurchase: number
}

type FormState = {
  pricePerRevision: number | ''
  maxRevisionsPerPurchase: number | ''
}

export default function AdminRevisionsPurchasePage() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    pricePerRevision: 100,
    maxRevisionsPerPurchase: 20,
  })

  const fetchSettings = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; settings: RevisionsPurchaseSettings }>('/admin/settings/revisions-purchase')
      if (result.success && result.settings) {
        setForm({
          pricePerRevision: result.settings.pricePerRevision ?? 100,
          maxRevisionsPerPurchase: result.settings.maxRevisionsPerPurchase ?? 20,
        })
      }
    } catch {
      toast.error('فشل تحميل إعدادات شراء التعديلات')
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
    const price = form.pricePerRevision === '' ? 0 : Number(form.pricePerRevision)
    const max = form.maxRevisionsPerPurchase === '' ? 20 : Number(form.maxRevisionsPerPurchase)
    if (price < 0) {
      toast.error('السعر يجب أن يكون 0 أو أكثر')
      return
    }
    if (max < 1 || max > 100) {
      toast.error('الحد الأقصى يجب أن يكون بين 1 و 100')
      return
    }
    setSaving(true)
    try {
      const result = await apiClient.put<{ success: boolean }>('/admin/settings/revisions-purchase', {
        pricePerRevision: price,
        maxRevisionsPerPurchase: max,
      })
      if (result.success) {
        toast.success('تم حفظ إعدادات شراء التعديلات')
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
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-2xl">
        <BackButton href="/admin/dashboard" label="العودة للوحة التحكم" />
        <h1 className="text-2xl font-bold text-charcoal dark:text-cream mt-4 mb-6 flex items-center gap-2">
          <Edit className="w-7 h-7 text-rocky-blue" aria-hidden />
          إعدادات شراء التعديلات الإضافية
        </h1>

        <Card className="dark:bg-charcoal-800 dark:border-charcoal-600 p-4 sm:p-6">
          <p className="text-sm text-blue-gray dark:text-greige mb-6">
            هذه الإعدادات تتحكم في سعر التعديل الواحد عند شراء العميل تعديلات إضافية والحد الأقصى لعدد التعديلات في عملية شراء واحدة.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                سعر التعديل الواحد (ريال)
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.pricePerRevision === '' ? '' : form.pricePerRevision}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({ ...f, pricePerRevision: v === '' ? '' : Math.max(0, Number(v)) }))
                }}
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                الحد الأقصى لعدد التعديلات في عملية شراء واحدة
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.maxRevisionsPerPurchase === '' ? '' : form.maxRevisionsPerPurchase}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    maxRevisionsPerPurchase: v === '' ? '' : Math.min(100, Math.max(1, Number(v) || 1)),
                  }))
                }}
                placeholder="20"
              />
              <p className="text-xs text-blue-gray dark:text-greige mt-1">بين 1 و 100</p>
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
