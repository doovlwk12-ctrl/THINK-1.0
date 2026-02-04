'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { Input } from '@/components/shared/Input'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Order {
  id: string
  orderNumber: string
  remainingRevisions: number
}

interface RevisionsPurchaseSettings {
  pricePerRevision: number
  maxRevisionsPerPurchase: number
}

export default function BuyRevisionsPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useAuth()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [settings, setSettings] = useState<RevisionsPurchaseSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [revisions, setRevisions] = useState(1)

  const maxRevisions = settings?.maxRevisionsPerPurchase ?? 20
  const pricePerRevision = settings?.pricePerRevision ?? 100

  const fetchData = useCallback(async () => {
    try {
      const [orderResult, settingsResult] = await Promise.all([
        apiClient.get<{ success: boolean; order: Order }>(`/orders/${orderId}`),
        apiClient.get<{ success: boolean; settings: RevisionsPurchaseSettings }>('/settings/revisions-purchase'),
      ])
      if (orderResult.success && orderResult.order) {
        setOrder(orderResult.order)
      }
      if (settingsResult.success && settingsResult.settings) {
        setSettings(settingsResult.settings)
        setRevisions((prev) => Math.min(Math.max(prev, 1), settingsResult.settings.maxRevisionsPerPurchase))
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل البيانات'
      toast.error(errorMessage)
      router.push(`/orders/${orderId}`)
    } finally {
      setLoading(false)
    }
  }, [orderId, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, router, fetchData])

  const handleSubmit = async () => {
    if (revisions < 1 || revisions > maxRevisions) {
      toast.error(`عدد التعديلات يجب أن يكون بين 1 و ${maxRevisions}`)
      return
    }

    setSubmitting(true)
    try {
      const result = await apiClient.post<{ success: boolean; message: string }>(`/orders/${orderId}/buy-revisions`, {
        revisions,
      })

      if (result.success) {
        toast.success(result.message)
        router.push(`/orders/${orderId}`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل شراء التعديلات'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  if (!order) {
    return null
  }

  const totalPrice = revisions * pricePerRevision

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-4 flex-1 max-w-2xl">
        <BackButton href={`/orders/${orderId}`} label="العودة لتفاصيل الطلب" />

        <Card className="mt-4 dark:bg-charcoal-800 dark:border-charcoal-600">
          <h1 className="text-2xl font-bold mb-4 text-charcoal dark:text-cream">شراء تعديلات إضافية</h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-rocky-blue/10 dark:bg-rocky-blue/20 border border-rocky-blue/30 dark:border-rocky-blue-600 rounded-lg">
              <p className="text-sm text-charcoal dark:text-cream">
                التعديلات المتبقية الحالية: <strong className="text-rocky-blue dark:text-rocky-blue-300">{order.remainingRevisions}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">
                عدد التعديلات المطلوبة (1–{maxRevisions})
              </label>
              <Input
                type="number"
                min={1}
                max={maxRevisions}
                value={revisions}
                onChange={(e) => setRevisions(Math.min(maxRevisions, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full"
              />
            </div>

            <div className="p-4 bg-greige/10 dark:bg-charcoal-700 rounded-lg border border-greige/30 dark:border-charcoal-600">
              <div className="flex justify-between mb-2 text-charcoal dark:text-cream">
                <span>سعر التعديل الواحد:</span>
                <span className="font-semibold">{pricePerRevision} ريال</span>
              </div>
              <div className="flex justify-between mb-2 text-charcoal dark:text-cream">
                <span>عدد التعديلات:</span>
                <span className="font-semibold">{revisions}</span>
              </div>
              <div className="border-t border-greige/30 dark:border-charcoal-600 pt-2 flex justify-between text-lg font-bold text-charcoal dark:text-cream">
                <span>المجموع:</span>
                <span className="text-rocky-blue dark:text-rocky-blue-300">{totalPrice} ريال</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ملاحظة: سيتم تمديد وقت التنفيذ <strong>{revisions}</strong> يوم (يوم واحد لكل تعديل إضافي).
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/orders/${orderId}`)}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'جاري المعالجة...' : 'شراء'}
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
