'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CreditCard, CheckCircle, Package } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { storage } from '@/lib/localStorage'
import toast from 'react-hot-toast'

interface Order {
  id: string
  orderNumber: string
  package: {
    id: string
    nameAr: string
    price: number
  }
  payment?: {
    status: string
  }
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useAuth()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [canChangePackage, setCanChangePackage] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState(() => {
    // Load saved payment method from localStorage
    return storage.get<string>('payment_method', 'card') || 'card'
  })

  // Save payment method to localStorage
  useEffect(() => {
    storage.set('payment_method', paymentMethod)
  }, [paymentMethod])

  const fetchOrder = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; order: Order }>(`/orders/${orderId}`)
      if (result.success) {
        setOrder(result.order)
        // Check if payment already completed - can't change package after payment
        if (result.order.payment && result.order.payment.status === 'completed') {
          setCanChangePackage(false)
        }
      }
    } catch {
      toast.error('فشل تحميل بيانات الطلب')
      router.push('/dashboard')
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
      fetchOrder()
    }
  }, [status, router, fetchOrder])

  const handlePayment = async () => {
    setProcessing(true)
    try {
      const result = await apiClient.post<{ success: boolean }>('/payments/create', {
        orderId,
        method: paymentMethod,
      })

      if (result.success) {
        toast.success('تم الدفع بنجاح')
        router.push(`/orders/${orderId}/chat`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل عملية الدفع'
      toast.error(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <BackButton href={`/orders/${orderId}`} label="العودة لتفاصيل الطلب" />
        </div>

        <Card>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">ملخص الطلب</h2>
              {canChangePackage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/orders/${orderId}/select-package`)}
                  className="flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  تغيير الباقة
                </Button>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">رقم الطلب:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">الباقة:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{(order as { packageForDisplay?: { nameAr: string } }).packageForDisplay?.nameAr ?? order.package?.nameAr}</span>
                  {canChangePackage && (
                    <span className="text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded border border-primary-200 dark:border-primary-800">
                      يمكن التغيير
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">المبلغ الإجمالي:</span>
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{(order as { packageForDisplay?: { price: number } }).packageForDisplay?.price ?? order.package?.price} ريال</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">طريقة الدفع</h2>
            <div className="space-y-3">
              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'card'
                  ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 bg-white dark:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="ml-3 text-primary-600 dark:text-primary-400"
                />
                <CreditCard className={`w-5 h-5 ml-2 ${
                  paymentMethod === 'card' 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className={`${
                  paymentMethod === 'card'
                    ? 'text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>بطاقة ائتمانية</span>
              </label>
              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'mada'
                  ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 bg-white dark:bg-gray-800'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  value="mada"
                  checked={paymentMethod === 'mada'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="ml-3 text-primary-600 dark:text-primary-400"
                />
                <CreditCard className={`w-5 h-5 ml-2 ${
                  paymentMethod === 'mada' 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className={`${
                  paymentMethod === 'mada'
                    ? 'text-gray-900 dark:text-gray-100 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>مدى</span>
              </label>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            loading={processing}
            className="w-full"
            size="lg"
          >
            {processing ? (
              'جاري المعالجة...'
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                تأكيد الدفع
              </>
            )}
          </Button>

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            سيتم توجيهك إلى صفحة الدفع الآمنة
          </p>
        </Card>
      </main>
    </div>
  )
}
