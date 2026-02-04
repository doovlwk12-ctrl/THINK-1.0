'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Package {
  id: string
  nameAr: string
  nameEn?: string
  price: number
  revisions: number
  executionDays: number
  features?: string[]
}

interface Order {
  id: string
  orderNumber: string
  package: {
    id: string
    nameAr: string
    price: number
  }
}

export default function SelectPackagePage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useAuth()
  const orderId = params.id as string

  const [packages, setPackages] = useState<Package[]>([])
  const [order, setOrder] = useState<Order | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchPackages = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; packages: Package[] }>('/packages')
      if (result.success) {
        setPackages(result.packages)
      }
    } catch {
      toast.error('فشل تحميل الباقات')
    }
  }, [])

  const fetchOrder = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; order: Order }>(`/orders/${orderId}`)
      if (result.success) {
        setOrder(result.order)
        // Set current package as selected if packages are loaded
        if (packages.length > 0) {
          const currentPkg = packages.find(p => p.id === result.order.package.id)
          if (currentPkg) {
            setSelectedPackage(currentPkg)
          }
        }
      }
    } catch {
      toast.error('فشل تحميل بيانات الطلب')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [orderId, router, packages])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchPackages()
    }
  }, [status, router, fetchPackages])

  useEffect(() => {
    if (packages.length > 0 && orderId) {
      fetchOrder()
    }
  }, [packages, orderId, fetchOrder])

  const handlePackageSelect = async () => {
    if (!selectedPackage || !order) {
      toast.error('يرجى اختيار باقة')
      return
    }

    // If same package, just proceed to payment
    if (selectedPackage.id === order.package.id) {
      router.push(`/orders/${orderId}/payment`)
      return
    }

    setUpdating(true)
    try {
      const result = await apiClient.put<{ success: boolean; message?: string }>(`/orders/${orderId}/package`, {
        packageId: selectedPackage.id,
      })

      if (result.success) {
        toast.success(result.message || 'تم تحديث الباقة بنجاح')
        router.push(`/orders/${orderId}/payment`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحديث الباقة'
      toast.error(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  if (!order || packages.length === 0) {
    return null
  }

  // Sort packages by price
  const sortedPackages = [...packages].sort((a, b) => a.price - b.price)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href={`/orders/${orderId}`} label="العودة لتفاصيل الطلب" />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">اختر الباقة المناسبة لك</h1>
            <p className="text-gray-600">قارن بين الباقات واختر الأنسب لمشروعك</p>
            <p className="text-sm text-gray-500 mt-2">رقم الطلب: #{order.orderNumber}</p>
          </div>

          {/* Comparison Table */}
          <Card className="mb-6 overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-right p-4 font-semibold text-gray-900">المميزات</th>
                    {sortedPackages.map((pkg) => (
                      <th
                        key={pkg.id}
                        className={`text-center p-4 font-semibold ${
                          selectedPackage?.id === pkg.id
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {pkg.nameAr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="p-4 font-medium text-gray-700">السعر</td>
                    {sortedPackages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className={`text-center p-4 ${
                          selectedPackage?.id === pkg.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <span className="text-2xl font-bold text-primary-600">
                          {pkg.price} ريال
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-4 font-medium text-gray-700">عدد التعديلات</td>
                    {sortedPackages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className={`text-center p-4 ${
                          selectedPackage?.id === pkg.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <span className="text-lg font-semibold">{pkg.revisions}</span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="p-4 font-medium text-gray-700">مدة التنفيذ</td>
                    {sortedPackages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className={`text-center p-4 ${
                          selectedPackage?.id === pkg.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <span>{pkg.executionDays} يوم</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Package Cards - يتكيّف مع عدد الباقات (1، 2، أو 3) */}
          <div
            className={`grid gap-6 mb-8 ${
              sortedPackages.length === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : sortedPackages.length === 2
                  ? 'md:grid-cols-2 max-w-4xl mx-auto'
                  : 'md:grid-cols-3'
            }`}
          >
            {sortedPackages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id
              const isCurrent = order.package.id === pkg.id
              const orderPrice = (order as { packageForDisplay?: { price: number } }).packageForDisplay?.price ?? order.package?.price ?? 0
              const priceDiff = pkg.price - orderPrice

              return (
                <Card
                  key={pkg.id}
                  className={`relative cursor-pointer transition-all ${
                    isSelected
                      ? 'border-2 border-primary-500 shadow-lg scale-105'
                      : 'border-2 border-gray-200 hover:border-primary-300'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {isCurrent && (
                    <div className="absolute top-3 left-3 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      الباقة الحالية
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="w-6 h-6 text-primary-600" />
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-2">{pkg.nameAr}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-primary-600">{pkg.price}</span>
                      <span className="text-gray-600 mr-2">ريال</span>
                    </div>

                    {priceDiff !== 0 && (
                      <div
                        className={`mb-4 text-sm font-medium ${
                          priceDiff > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {priceDiff > 0 ? '+' : ''}
                        {priceDiff} ريال {priceDiff > 0 ? 'زيادة' : 'توفير'}
                      </div>
                    )}

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">
                          <strong>{pkg.revisions}</strong> تعديلات متاحة
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">
                          <strong>{pkg.executionDays}</strong> يوم تنفيذ
                        </span>
                      </div>
                      {(pkg.features?.length ? pkg.features : ['دعم فني متواصل']).map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={`w-full ${
                        isSelected
                          ? 'bg-primary-600 hover:bg-primary-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPackage(pkg)
                      }}
                    >
                      {isSelected ? 'محدد' : 'اختر هذه الباقة'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Selected Package Summary */}
          {selectedPackage && (
            <Card className="bg-primary-50 border-primary-200 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">الباقة المختارة</p>
                  <p className="text-xl font-bold text-primary-700">{selectedPackage.nameAr}</p>
                  <p className="text-lg font-semibold text-primary-600 mt-1">
                    {selectedPackage.price} ريال
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-600 mb-1">المميزات</p>
                  <p className="text-sm text-gray-700">
                    {selectedPackage.revisions} تعديلات • {selectedPackage.executionDays} يوم
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/orders/${orderId}`)}
              className="flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              العودة
            </Button>
            <Button
              onClick={handlePackageSelect}
              loading={updating}
              disabled={!selectedPackage}
              className="flex items-center gap-2"
              size="lg"
            >
              {updating ? (
                'جاري التحديث...'
              ) : (
                <>
                  المتابعة للدفع
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
