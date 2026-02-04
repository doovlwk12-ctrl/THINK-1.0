'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Plus, Edit, Power, Info } from 'lucide-react'

const MAX_PACKAGES = 3
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { Input } from '@/components/shared/Input'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Package {
  id: string
  nameAr: string
  nameEn?: string
  price: number
  revisions: number
  executionDays: number
  isActive: boolean
  featuresJson?: string | null
  createdAt?: string
}

export default function AdminPackagesPage() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    price: '',
    revisions: '',
    executionDays: '',
    isActive: true,
    features: '', // سطر واحد لكل ميزة
  })

  const fetchPackages = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; packages: Package[] }>('/admin/packages')
      if (result.success) {
        setPackages(result.packages)
      }
    } catch {
      toast.error('فشل تحميل الباقات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && session?.user?.role != null) {
      if (session.user.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      fetchPackages()
    }
  }, [status, session, session?.user?.role, router, fetchPackages])

  const parseFeatures = (s: string): string[] =>
    s
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

  // حد المميزات: الباقة الأولى ميزة واحدة، الثانية ميزتان، الثالثة 3 فقط (حسب ترتيب الإنشاء)
  const getMaxFeatures = (): number => {
    const sorted = [...packages].sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    )
    if (editingPackage) {
      const idx = sorted.findIndex((p) => p.id === editingPackage.id)
      return idx >= 0 ? idx + 1 : 1
    }
    return Math.min(packages.length + 1, MAX_PACKAGES)
  }

  const maxFeatures = getMaxFeatures()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      let features = parseFeatures(formData.features)
      if (features.length > maxFeatures) {
        toast.error(`حد المميزات لهذه الباقة: ${maxFeatures} ${maxFeatures === 1 ? 'ميزة واحدة' : maxFeatures === 2 ? 'ميزتان' : '3 مميزات'} فقط.`)
        return
      }
      features = features.slice(0, maxFeatures)
      const data = {
        nameAr: formData.nameAr,
        nameEn: formData.nameEn || undefined,
        price: parseFloat(formData.price),
        revisions: parseInt(formData.revisions),
        executionDays: parseInt(formData.executionDays),
        isActive: formData.isActive,
        ...(features.length ? { features } : {}),
      }

      if (editingPackage) {
        const result = await apiClient.put<{ success: boolean }>(`/admin/packages/${editingPackage.id}`, data)
        if (result.success) {
          toast.success('تم تحديث الباقة بنجاح')
          setShowForm(false)
          setEditingPackage(null)
          resetForm()
          fetchPackages()
        }
      } else {
        const result = await apiClient.post<{ success: boolean }>('/admin/packages', data)
        if (result.success) {
          toast.success('تم إنشاء الباقة بنجاح')
          setShowForm(false)
          resetForm()
          fetchPackages()
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل حفظ الباقة'
      toast.error(errorMessage)
    }
  }

  const featuresJsonToText = (json: string | null | undefined): string => {
    if (!json?.trim()) return ''
    try {
      const arr = JSON.parse(json) as unknown
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string').join('\n') : ''
    } catch {
      return ''
    }
  }

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    const sorted = [...packages].sort(
      (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
    )
    const idx = sorted.findIndex((p) => p.id === pkg.id)
    const maxForPkg = idx >= 0 ? idx + 1 : 1
    const allFeatures = featuresJsonToText(pkg.featuresJson)
    const lines = allFeatures.split('\n').filter(Boolean)
    const truncated = lines.slice(0, maxForPkg).join('\n')
    setFormData({
      nameAr: pkg.nameAr,
      nameEn: pkg.nameEn || '',
      price: pkg.price.toString(),
      revisions: pkg.revisions.toString(),
      executionDays: pkg.executionDays.toString(),
      isActive: pkg.isActive,
      features: truncated,
    })
    setShowForm(true)
  }

  const handleToggleActive = async (pkg: Package) => {
    const newActive = !pkg.isActive
    const action = newActive ? 'تفعيل' : 'تعطيل'
    if (!confirm(newActive ? `هل تريد تفعيل الباقة "${pkg.nameAr}"؟` : `هل تريد تعطيل الباقة "${pkg.nameAr}"؟`)) {
      return
    }

    try {
      const result = await apiClient.put<{ success: boolean }>(`/admin/packages/${pkg.id}`, { isActive: newActive })
      if (result.success) {
        fetchPackages()
        toast.success(newActive ? 'تم تفعيل الباقة بنجاح' : 'تم تعطيل الباقة بنجاح')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `فشل ${action} الباقة`
      toast.error(errorMessage)
    }
  }

  const resetForm = () => {
    setFormData({
      nameAr: '',
      nameEn: '',
      price: '',
      revisions: '',
      executionDays: '',
      isActive: true,
      features: '',
    })
  }

  const activeCount = packages.filter((p) => p.isActive).length

  const roleReady = status === 'authenticated' && session?.user?.role != null
  const isAdmin = session?.user?.role === 'ADMIN'
  if (status === 'loading' || !roleReady || !isAdmin || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <BackButton href="/admin/dashboard" label="العودة للوحة التحكم" />
          <Button
            onClick={() => {
              if (activeCount >= MAX_PACKAGES) {
                toast.error(
                  'الحد الأقصى 3 باقات نشطة حالياً. يمكنك تعطيل باقة لاخفائها من العرض ثم إضافة باقة جديدة. ميزة إضافة المزيد قادمة.'
                )
                return
              }
              setEditingPackage(null)
              resetForm()
              setShowForm(true)
            }}
            disabled={activeCount >= MAX_PACKAGES}
            title={activeCount >= MAX_PACKAGES ? 'الحد الأقصى 3 باقات نشطة. عطّل باقة لإضافة واحدة جديدة.' : undefined}
          >
            <Plus className="w-4 h-4" />
            إضافة باقة جديدة
          </Button>
        </div>

        <h1 className="text-2xl font-bold mb-4 text-charcoal dark:text-cream">إدارة الباقات</h1>

        {activeCount >= MAX_PACKAGES ? (
          <div className="mb-6 p-4 rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">الحد الأقصى 3 باقات نشطة حالياً.</p>
              <p className="mt-1 text-amber-700 dark:text-amber-300">
                في حال تعطيل باقة يمكنك إضافة باقة جديدة (حتى الحد الأقصى 3). زر «إضافة باقة جديدة» يبقى ظاهراً لهذا الغرض. ميزة إضافة أكثر من 3 باقات قادمة.
              </p>
            </div>
          </div>
        ) : (
          <p className="mb-6 text-sm text-blue-gray dark:text-greige">
            يمكنك إضافة باقة جديدة حتى الحد الأقصى (3 باقات نشطة). النشطة حالياً: {activeCount}.
          </p>
        )}

        {/* Form Modal */}
        {showForm && (
          <Card className="mb-6 dark:bg-charcoal-800 dark:border-charcoal-600">
            <h2 className="text-xl font-semibold mb-4 text-charcoal dark:text-cream">
              {editingPackage ? 'تعديل الباقة' : 'إضافة باقة جديدة'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">الاسم بالعربية *</label>
                  <Input
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">الاسم بالإنجليزية</label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">السعر (ريال) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">عدد التعديلات *</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.revisions}
                    onChange={(e) => setFormData({ ...formData, revisions: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">أيام التنفيذ *</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.executionDays}
                    onChange={(e) => setFormData({ ...formData, executionDays: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-rocky-blue bg-greige/20 dark:bg-charcoal-700 border-greige/30 dark:border-charcoal-600 rounded focus:ring-rocky-blue"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-charcoal dark:text-cream">
                    نشط
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2 text-charcoal dark:text-cream">
                    مميزات إضافية (سطر واحد لكل ميزة — حد أقصى {maxFeatures === 1 ? 'ميزة واحدة' : maxFeatures === 2 ? 'ميزتان' : '3 مميزات'} لهذه الباقة)
                  </label>
                  <textarea
                    value={formData.features}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n')
                      const kept = lines.slice(0, maxFeatures)
                      setFormData({ ...formData, features: kept.join('\n') })
                    }}
                    placeholder={maxFeatures === 1 ? 'ميزة واحدة فقط' : maxFeatures === 2 ? 'ميزة أولى\nميزة ثانية' : 'ميزة أولى\nميزة ثانية\nميزة ثالثة'}
                    rows={Math.min(maxFeatures + 1, 4)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 text-charcoal dark:text-cream focus:ring-2 focus:ring-rocky-blue focus:border-rocky-blue"
                  />
                  <p className="mt-1 text-xs text-blue-gray dark:text-greige">
                    الباقة الأولى: ميزة واحدة • الثانية: ميزتان • الثالثة: 3 مميزات. الحالية: {parseFeatures(formData.features).length}/{maxFeatures}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingPackage ? 'تحديث' : 'إضافة'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingPackage(null)
                    resetForm()
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Packages List */}
        <div className="space-y-4">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-charcoal dark:text-cream">{pkg.nameAr}</h3>
                    {pkg.isActive ? (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                        نشط
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-greige/30 dark:bg-charcoal-600 text-charcoal dark:text-cream rounded-full text-xs font-medium">
                        غير نشط
                      </span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-gray dark:text-greige">السعر:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{pkg.price} ريال</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">التعديلات:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{pkg.revisions}</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">أيام التنفيذ:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{pkg.executionDays}</span>
                    </div>
                    {pkg.nameEn && (
                      <div>
                        <span className="text-blue-gray dark:text-greige">Name (EN):</span>
                        <span className="font-semibold mr-2 text-charcoal dark:text-cream">{pkg.nameEn}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(pkg)}
                  >
                    <Edit className="w-4 h-4" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(pkg)}
                    className={pkg.isActive ? 'text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300' : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'}
                  >
                    <Power className="w-4 h-4" />
                    {pkg.isActive ? 'تعطيل' : 'تفعيل'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
