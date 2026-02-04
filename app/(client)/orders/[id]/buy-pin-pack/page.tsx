'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, Package } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

const MAX_PIN_GROUPS = 6

interface PinPackSettings {
  pinPackPrice: number
  pinPackOldPrice: number | null
  pinPackDiscountPercent: number | null
}

export default function BuyPinPackPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useAuth()
  const orderId = params.id as string

  const [settings, setSettings] = useState<PinPackSettings | null>(null)
  const [pinPackPurchasesCount, setPinPackPurchasesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, orderRes] = await Promise.all([
        apiClient.get<{ success: boolean; pinPack: PinPackSettings }>('/settings/pin-pack'),
        apiClient.get<{ success: boolean; order: { pinPackPurchasesCount?: number } }>(`/orders/${orderId}`),
      ])
      if (settingsRes.success && settingsRes.pinPack) {
        setSettings(settingsRes.pinPack)
      }
      if (orderRes.success && orderRes.order) {
        setPinPackPurchasesCount(orderRes.order.pinPackPurchasesCount ?? 0)
      }
    } catch {
      toast.error('فشل تحميل البيانات')
      router.push(`/orders/${orderId}/revision`)
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

  const handlePay = async () => {
    if (!settings || settings.pinPackPrice <= 0) {
      toast.error('سعر مجموعة الدبابيس غير متوفر')
      return
    }

    const currentGroups = 1 + pinPackPurchasesCount
    if (currentGroups >= MAX_PIN_GROUPS) {
      toast.error('وصلت للحد الأقصى من مجموعات الدبابيس (6)')
      return
    }

    setProcessing(true)
    try {
      const result = await apiClient.post<{ success: boolean; error?: string }>(`/orders/${orderId}/buy-pin-pack`, {})

      if (result.success) {
        toast.success('تم شراء مجموعة الدبابيس بنجاح')
        router.push(`/orders/${orderId}/revision`)
      } else {
        toast.error(result.error ?? 'فشل الشراء')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل شراء مجموعة الدبابيس'
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  const currentGroups = 1 + pinPackPurchasesCount
  const atMaxGroups = currentGroups >= MAX_PIN_GROUPS
  const price = settings?.pinPackPrice ?? 0
  const hasDiscount = settings?.pinPackOldPrice != null && settings.pinPackOldPrice > 0 && (settings.pinPackDiscountPercent ?? 0) > 0

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />
      <main className="container mx-auto px-4 py-4 flex-1 max-w-2xl">
        <BackButton href={`/orders/${orderId}/revision`} label="العودة لصفحة التعديل" />

        <Card className="mt-4 dark:bg-charcoal-800 dark:border-charcoal-600">
          <h1 className="text-2xl font-bold text-charcoal dark:text-cream mb-4 flex items-center gap-2">
            <Package className="w-7 h-7" />
            شراء مجموعة دبابيس
          </h1>

          <p className="text-blue-gray dark:text-greige mb-4">
            مجموعة واحدة = 6 دبابيس بألوان مختلفة. المجموعات الحالية: {currentGroups} من {MAX_PIN_GROUPS}.
          </p>

          {atMaxGroups ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200">
                وصلت للحد الأقصى من مجموعات الدبابيس (6). لا يمكنك شراء المزيد.
              </p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => router.push(`/orders/${orderId}/revision`)}>
                العودة لصفحة التعديل
              </Button>
            </div>
          ) : price <= 0 ? (
            <div className="p-4 bg-greige/20 dark:bg-charcoal-700 rounded-lg">
              <p className="text-blue-gray dark:text-greige">سعر مجموعة الدبابيس غير معرّف. تواصل مع الإدارة.</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-greige/20 dark:bg-charcoal-700 rounded-lg mb-4">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-charcoal dark:text-cream">سعر المجموعة:</span>
                  <div className="flex items-center gap-2">
                    {hasDiscount && (
                      <span className="text-sm text-blue-gray dark:text-greige line-through">
                        {settings?.pinPackOldPrice} ريال
                      </span>
                    )}
                    <span className="text-xl font-bold text-rocky-blue dark:text-rocky-blue-300">
                      {price} ريال
                    </span>
                    {(settings?.pinPackDiscountPercent ?? 0) > 0 && (
                      <span className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                        خصم {settings?.pinPackDiscountPercent}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => router.push(`/orders/${orderId}/revision`)}>
                  إلغاء
                </Button>
                <Button onClick={handlePay} disabled={processing} className="flex-1">
                  {processing ? 'جاري المعالجة...' : (
                    <>
                      <CheckCircle className="w-4 h-4 ml-2" />
                      دفع {price} ريال
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
