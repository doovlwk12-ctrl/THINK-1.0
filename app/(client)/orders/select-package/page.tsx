'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { storage } from '@/lib/localStorage'
import toast from 'react-hot-toast'

interface Package {
  id: string
  nameAr: string
  nameEn?: string
  price: number
  revisions: number
  executionDays: number
  isActive?: boolean
  features?: string[]
}

// نفس مصدر الباقات في الصفحة الرئيسية — التعديلات من لوحة تحكم المنصة تنعكس هنا تلقائياً
const FALLBACK_PACKAGES: Package[] = [
  { id: 'basic', nameAr: 'الباقة الأساسية', price: 500, revisions: 2, executionDays: 5 },
  { id: 'standard', nameAr: 'الباقة القياسية', price: 1000, revisions: 3, executionDays: 7 },
  { id: 'premium', nameAr: 'الباقة المميزة', price: 2000, revisions: 6, executionDays: 10 },
]

const PACKAGES_FALLBACK_MS = 5000

function SelectPackageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useAuth()

  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)
  const resolvedRef = useRef(false)
  const initialSelectionDoneRef = useRef(false)

  const fetchPackages = useCallback(async () => {
    resolvedRef.current = false
    setLoading(true)
    const timeoutId = setTimeout(() => {
      if (resolvedRef.current) return
      setPackages(FALLBACK_PACKAGES)
      setLoading(false)
    }, PACKAGES_FALLBACK_MS)
    try {
      const result = await apiClient.get<{ success: boolean; packages: Package[] }>('/packages')
      resolvedRef.current = true
      if (result.success && result.packages?.length) {
        setPackages(result.packages)
      } else {
        setPackages(FALLBACK_PACKAGES)
      }
    } catch {
      resolvedRef.current = true
      toast.error('فشل تحميل الباقات')
      setPackages(FALLBACK_PACKAGES)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchPackages()
    }
  }, [status, router, fetchPackages])

  // تعيين الباقة المختارة من الرابط (الصفحة الرئيسية) أو من التخزين المحلي — الأولوية لمعامل الرابط
  useEffect(() => {
    if (packages.length === 0 || initialSelectionDoneRef.current) return
    initialSelectionDoneRef.current = true
    const fromUrl = searchParams.get('package')
    const id = fromUrl || storage.get<string>('order_selected_package')
    if (id) {
      const pkg = packages.find((p) => p.id === id)
      if (pkg) setSelectedPackage(pkg)
    }
  }, [packages, searchParams])

  const handleContinue = () => {
    if (!selectedPackage) {
      toast.error('يرجى اختيار باقة')
      return
    }

    // Save selected package
    storage.set('order_selected_package', selectedPackage.id)
    
    // Redirect to create order page with package ID
    router.push(`/orders/create?package=${selectedPackage.id}`)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  // Sort packages by price
  const sortedPackages = [...packages].sort((a, b) => a.price - b.price)

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href="/dashboard" label="العودة للوحة التحكم" />
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-charcoal dark:text-cream mb-2">اختر الباقة المناسبة لك</h1>
            <p className="text-blue-gray dark:text-greige">قارن بين الباقات واختر الأنسب لمشروعك</p>
          </div>

          {/* Comparison Table */}
          <Card className="mb-6 overflow-x-auto">
            <div className="min-w-full">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-greige/30 dark:border-charcoal-600">
                    <th className="text-right p-4 font-bold text-charcoal dark:text-cream">المميزات</th>
                    {sortedPackages.map((pkg) => (
                      <th
                        key={pkg.id}
                        className={`text-center p-4 font-bold ${
                          selectedPackage?.id === pkg.id
                            ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300'
                            : 'text-charcoal dark:text-cream'
                        }`}
                      >
                        {pkg.nameAr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-greige/20 dark:border-charcoal-700">
                    <td className="p-4 font-semibold text-charcoal dark:text-cream">السعر</td>
                    {sortedPackages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className={`text-center p-4 ${
                          selectedPackage?.id === pkg.id ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20' : ''
                        }`}
                      >
                        <span className="text-2xl font-black text-rocky-blue dark:text-rocky-blue-300">
                          {pkg.price} ريال
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-greige/20 dark:border-charcoal-700">
                    <td className="p-4 font-semibold text-charcoal dark:text-cream">عدد التعديلات</td>
                    {sortedPackages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className={`text-center p-4 ${
                          selectedPackage?.id === pkg.id ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20' : ''
                        }`}
                      >
                        <span className="text-lg font-bold text-charcoal dark:text-cream">{pkg.revisions}</span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-greige/20 dark:border-charcoal-700">
                    <td className="p-4 font-semibold text-charcoal dark:text-cream">مدة التنفيذ</td>
                    {sortedPackages.map((pkg) => (
                      <td
                        key={pkg.id}
                        className={`text-center p-4 ${
                          selectedPackage?.id === pkg.id ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20' : ''
                        }`}
                      >
                        <span className="text-charcoal dark:text-cream">{pkg.executionDays} يوم</span>
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

              return (
                <Card
                  key={pkg.id}
                  className={`relative cursor-pointer transition-all duration-300 hover:shadow-hard-lg ${
                    isSelected
                      ? 'border-2 border-rocky-blue dark:border-rocky-blue-400 shadow-hard scale-105'
                      : 'border-2 border-greige/30 dark:border-charcoal-600 hover:border-rocky-blue/50 dark:hover:border-rocky-blue-500/50'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-10">
                      <CheckCircle className="w-6 h-6 text-rocky-blue dark:text-rocky-blue-300" />
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-2xl font-black mb-2 text-charcoal dark:text-cream">{pkg.nameAr}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-black text-rocky-blue dark:text-rocky-blue-300">{pkg.price}</span>
                      <span className="text-blue-gray dark:text-greige mr-2">ريال</span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300 flex-shrink-0" />
                        <span className="text-charcoal dark:text-cream">
                          <strong>{pkg.revisions}</strong> تعديلات متاحة
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300 flex-shrink-0" />
                        <span className="text-charcoal dark:text-cream">
                          <strong>{pkg.executionDays}</strong> يوم تنفيذ
                        </span>
                      </div>
                      {(pkg.features?.length ? pkg.features : ['دعم فني متواصل']).map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300 flex-shrink-0" />
                          <span className="text-charcoal dark:text-cream">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={isSelected ? 'primary' : 'outline'}
                      className="w-full"
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
            <Card className="bg-rocky-blue/10 dark:bg-rocky-blue/20 border-2 border-rocky-blue dark:border-rocky-blue-400 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige mb-1">الباقة المختارة</p>
                  <p className="text-xl font-black text-rocky-blue dark:text-rocky-blue-300">{selectedPackage.nameAr}</p>
                  <p className="text-lg font-bold text-rocky-blue dark:text-rocky-blue-300 mt-1">
                    {selectedPackage.price} ريال
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-blue-gray dark:text-greige mb-1">المميزات</p>
                  <p className="text-sm text-charcoal dark:text-cream font-semibold">
                    {selectedPackage.revisions} تعديلات • {selectedPackage.executionDays} يوم
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleContinue}
              disabled={!selectedPackage}
              className="flex items-center gap-2"
              size="lg"
            >
              المتابعة لتعبئة النموذج
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SelectPackagePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    }>
      <SelectPackageContent />
    </Suspense>
  )
}
