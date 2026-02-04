'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Upload, Download, User, Clock, Send, X, Edit, MessageCircle, Trash2, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { compressImage, isImageFile, formatFileSize } from '@/lib/imageCompression'
import { formatDateHijriMiladi, formatDateTimeHijriMiladi } from '@/lib/utils'
import toast from 'react-hot-toast'

interface OrderAuditEntry {
  id: string
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  client: {
    name: string
    email: string
    phone: string
  }
  package: {
    nameAr: string
    price: number
  }
  formData: string
  deadline: string
  plans: Array<{
    id: string
    fileUrl: string
    fileType: string
    fileName?: string | null
    createdAt: string
    isActive: boolean
  }>
  auditLogs?: OrderAuditEntry[]
}

interface RevisionRequest {
  id: string
  orderId: string
  planId: string | null
  pins: Array<{
    x: number
    y: number
    color: string
    note: string
  }>
  status: string
  createdAt: string
  updatedAt: string
}

export default function EngineerOrderPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useAuth()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; original?: File }>>([])
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const unsentPlans = order?.plans?.filter((p) => !p.isActive) ?? []

  const fetchRevisionRequests = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; revisionRequests: RevisionRequest[] }>(
        `/revisions/${orderId}`
      )
      if (result.success) {
        setRevisionRequests(result.revisionRequests)
      }
    } catch {
      // Silent fail - revisions are optional
    }
  }, [orderId])

  const fetchOrder = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; order: Order }>(`/engineer/orders/${orderId}`)
      if (result.success) {
        setOrder(result.order)
      }
    } catch {
      toast.error('فشل تحميل بيانات الطلب')
      router.back()
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
      if (session?.user?.role !== 'ENGINEER' && session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      fetchOrder()
      fetchRevisionRequests()
    }
  }, [status, session, router, fetchOrder, fetchRevisionRequests, orderId]) // Re-fetch when orderId changes (navigation)

  const MAX_PLAN_FILES = 6
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024   // 10MB لكل ملف
  const MAX_TOTAL_SIZE_BYTES = 30 * 1024 * 1024 // 30MB للمجموع
  const MAX_FILE_SIZE_AFTER_SAVE_BYTES = 5 * 1024 * 1024 // 5MB حد بعد الحفظ (تنبيه إذا تجاوز)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return
    const toAdd = Math.min(selected.length, MAX_PLAN_FILES - pendingFiles.length)
    if (toAdd <= 0) {
      toast.error(`الحد الأقصى ${MAX_PLAN_FILES} ملفات`)
      e.target.value = ''
      return
    }
    const currentTotal = pendingFiles.reduce((sum, p) => sum + p.file.size, 0)
    for (let i = 0; i < toAdd; i++) {
      if (selected[i].size > MAX_FILE_SIZE_BYTES) {
        toast.error(`الملف "${selected[i].name}" يتجاوز الحد (10MB). يُرجى تقليل حجمه.`)
        e.target.value = ''
        return
      }
    }
    setCompressing(true)
    try {
      const tasks = Array.from({ length: toAdd }, async (_, i) => {
        const f = selected[i]
        if (isImageFile(f)) {
          try {
            const compressed = await compressImage(f, {
              maxSizeMB: 2,
              maxWidthOrHeight: 1920,
              quality: 0.8,
            })
            return { file: compressed, original: f } as { file: File; original?: File }
          } catch {
            return { file: f } as { file: File; original?: File }
          }
        }
        return { file: f } as { file: File; original?: File }
      })
      const results = await Promise.all(tasks)
      const newTotal = currentTotal + results.reduce((sum, r) => sum + r.file.size, 0)
      if (newTotal > MAX_TOTAL_SIZE_BYTES) {
        toast.error(`المجموع الكلي للملفات يتجاوز 30MB. يُرجى تقليل عدد الملفات أو أحجامها.`)
        e.target.value = ''
        return
      }
      results.forEach((entry) => {
        if (entry.original && entry.file.size < entry.original.size) {
          toast.success(`تم ضغط: ${entry.original.name}`)
        }
        if (entry.file.size > MAX_FILE_SIZE_AFTER_SAVE_BYTES) {
          toast(`حجم "${entry.file.name}" بعد الضغط كبير. الحد بعد الحفظ 5MB — يُنصح بتقليل الحجم.`, { icon: '⚠️', duration: 5000 })
        }
      })
      setPendingFiles((prev) => [...prev, ...results].slice(0, MAX_PLAN_FILES))
      if (selected.length > toAdd) {
        toast.error(`تم إضافة ${toAdd} ملفات فقط (الحد الأقصى ${MAX_PLAN_FILES})`)
      }
    } finally {
      setCompressing(false)
      e.target.value = ''
    }
  }

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (pendingFiles.length === 0) {
      toast.error('يرجى اختيار ملف أو أكثر (حد أقصى 6)')
      return
    }
    const totalSize = pendingFiles.reduce((sum, p) => sum + p.file.size, 0)
    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      toast.error(`المجموع الكلي للملفات يتجاوز 30MB. يُرجى تقليل عدد الملفات أو أحجامها.`)
      return
    }
    const oversized = pendingFiles.find((p) => p.file.size > MAX_FILE_SIZE_BYTES)
    if (oversized) {
      toast.error(`الملف "${oversized.file.name}" يتجاوز 10MB. يُرجى تقليل حجمه.`)
      return
    }

    setUploading(true)
    setUploadProgress({ current: 0, total: pendingFiles.length })
    let successCount = 0
    const UPLOAD_CONCURRENCY = 2 // Upload 2 files at a time for faster completion
    try {
      for (let offset = 0; offset < pendingFiles.length; offset += UPLOAD_CONCURRENCY) {
        const batch = pendingFiles.slice(offset, offset + UPLOAD_CONCURRENCY)
        const batchResults = await Promise.all(
          batch.map(async (item, batchIndex) => {
            const i = offset + batchIndex
            const formData = new FormData()
            formData.append('file', item.file)
            formData.append('orderId', orderId)
            const result = await apiClient.postFormData<{ success: boolean; error?: string }>('/plans/upload', formData)
            setUploadProgress((prev) => (prev ? { ...prev, current: Math.min(prev.current + 1, prev.total) } : null))
            return { index: i, success: result.success, error: result.error }
          })
        )
        const failed = batchResults.find((r) => !r.success)
        if (failed) {
          toast.error(failed.error || `فشل رفع الملف ${failed.index + 1}`)
          successCount += batchResults.filter((r) => r.success).length
          break
        }
        successCount += batchResults.length
      }
      if (successCount > 0) {
        toast.success(successCount === pendingFiles.length ? 'تم رفع جميع المخططات بنجاح' : `تم رفع ${successCount} من ${pendingFiles.length}`)
        setPendingFiles([])
        try {
          const whatsappResult = await apiClient.post<{ success: boolean; whatsappUrl?: string | null }>('/whatsapp/plan-uploaded', { orderId })
          if (whatsappResult.success && whatsappResult.whatsappUrl) setWhatsappUrl(whatsappResult.whatsappUrl)
        } catch { /* silent */ }
        fetchOrder()
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء الرفع'
      toast.error(msg)
    } finally {
      setUploading(false)
      setUploadProgress(null)
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    }
  }

  const handleStartOrder = async () => {
    try {
      const result = await apiClient.post<{ success: boolean }>(`/engineer/orders/${orderId}/start`)
      if (result.success) {
        toast.success('تم بدء العمل على الطلب')
        fetchOrder()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل بدء الطلب'
      toast.error(errorMessage)
    }
  }

  const handleSendPlans = async (planIds: string[]) => {
    if (!planIds.length) {
      toast.error('لا يوجد مخططات للإرسال')
      return
    }
    if (planIds.length > 6) {
      toast.error('الحد الأقصى 6 مخططات')
      return
    }
    setSending(true)
    try {
      const result = await apiClient.post<{ success: boolean; whatsappUrl?: string | null }>('/plans/send', {
        orderId,
        planIds,
      })
      if (result.success) {
        toast.success(planIds.length === 1 ? 'تم إرسال المخطط للعميل بنجاح' : 'تم إرسال المخططات للعميل بنجاح')
        setWhatsappUrl(result.whatsappUrl || null)
        fetchOrder()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل إرسال المخططات'
      toast.error(errorMessage)
    } finally {
      setSending(false)
    }
  }

  const handleOpenWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank')
    }
  }

  const handleDeletePlan = async (planId: string) => {
    // Confirm deletion
    if (!confirm('هل أنت متأكد من حذف هذا المخطط؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return
    }

    setDeletingPlanId(planId)
    try {
      const result = await apiClient.delete<{ success: boolean; message?: string; error?: string }>(`/plans/${planId}`)

      if (result.success) {
        toast.success(result.message || 'تم حذف المخطط بنجاح')
        fetchOrder()
      } else {
        toast.error(result.error || 'فشل حذف المخطط')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل حذف المخطط'
      toast.error(errorMessage)
    } finally {
      setDeletingPlanId(null)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    
    if (newStatus === order.status) {
      return
    }

    setUpdatingStatus(true)
    try {
      const result = await apiClient.put<{ success: boolean; message?: string; error?: string; order?: Order }>(
        `/engineer/orders/${orderId}/status`,
        { status: newStatus }
      )

      if (result.success) {
        toast.success(result.message || 'تم تحديث حالة الطلب بنجاح')
        fetchOrder()
      } else {
        toast.error(result.error || 'فشل تحديث حالة الطلب')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحديث حالة الطلب'
      toast.error(errorMessage)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
      case 'CLOSED':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600'
      case 'IN_PROGRESS':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
      case 'REVIEW':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
      case 'PENDING':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
      case 'ARCHIVED':
        return 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'مكتمل'
      case 'CLOSED':
        return 'منتهي'
      case 'IN_PROGRESS':
        return 'قيد التنفيذ'
      case 'REVIEW':
        return 'قيد المراجعة'
      case 'PENDING':
        return 'في الانتظار'
      case 'ARCHIVED':
        return 'مؤرشف'
      default:
        return status
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

  const formData = JSON.parse(order.formData || '{}')
  const category = typeof formData.projectCategory === 'string' ? formData.projectCategory : ''
  const categoryLabelMap: Record<string, string> = {
    residential: 'سكني',
    commercial: 'تجاري',
    service: 'خدمي',
    touristic: 'سياحي',
  }
  const cityValue = typeof formData.city === 'string' ? formData.city : typeof formData.location === 'string' ? formData.location : '-'
  const districtValue =
    formData.district === 'أخرى' && formData.districtOther
      ? String(formData.districtOther)
      : typeof formData.district === 'string'
      ? formData.district
      : '-'
  const projectTypeLabel = formData.projectType === 'new' ? 'مخطط معماري جديد' : formData.projectType === 'renovation' ? 'تطوير مخطط قائم' : '-'

  const formatValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.map((x) => String(x)).join('، ')
    if (value === null || value === undefined) return '-'
    const text = String(value)
    return text.trim() === '' ? '-' : text
  }

  const detailSections = (() => {
    if (category === 'residential') {
      return [
        {
          title: 'نمط الحياة',
          fields: [
            { label: 'كيف يقضي أفراد الأسرة أغلب وقتهم؟', key: 'res_lifestyle_familyTime' },
            { label: 'الفراغات المفتوحة أو المغلقة', key: 'res_lifestyle_openSpaces' },
            { label: 'الصالة', key: 'res_livingRoom' },
            { label: 'أنشطة يومية تحتاج فراغ مخصص', key: 'res_dailyActivities' },
          ],
        },
        {
          title: 'الخصوصية',
          fields: [
            { label: 'مستوى الخصوصية', key: 'res_privacy_level' },
            { label: 'فصل الرجال عن النساء', key: 'res_gender_separation' },
            { label: 'تفضيلات الخصوصية', key: 'res_privacy_features' },
            { label: 'النوافذ', key: 'res_windows' },
          ],
        },
        {
          title: 'الأسرة والاستخدام الفعلي',
          fields: [
            { label: 'عدد أفراد الأسرة', key: 'res_family_size' },
            { label: 'زيادة مستقبلية', key: 'res_family_growth' },
            { label: 'أعمار أفراد الأسرة', key: 'res_family_ages' },
            { label: 'غرفة أرضية لكبار السن', key: 'res_elderly_room' },
            { label: 'غرفة مربية/سائق', key: 'res_nanny_driver_room' },
            { label: 'غرفة متعددة الاستخدام', key: 'res_multiuse_room' },
          ],
        },
        {
          title: 'أسلوب الحياة اليومي',
          fields: [
            { label: 'أسلوب الطبخ', key: 'res_cooking_style' },
            { label: 'نوع المطبخ', key: 'res_kitchen_type' },
            { label: 'الغسيل', key: 'res_laundry' },
            { label: 'التخزين', key: 'res_storage' },
          ],
        },
        {
          title: 'الذوق والتوجه المعماري',
          fields: [
            { label: 'الذوق العام', key: 'res_style' },
            { label: 'ارتفاع الفراغات', key: 'res_ceiling_height' },
            { label: 'الإضاءة الطبيعية', key: 'res_natural_light' },
          ],
        },
        {
          title: 'القيود والتوضيحات',
          fields: [
            { label: 'شكل الأرض', key: 'res_land_shape' },
            { label: 'أكثر شيء يزعجك', key: 'res_annoying' },
            { label: 'أكثر شيء تحبه', key: 'res_favorite' },
            { label: 'تغييرات تتمنى تعديلها', key: 'res_regrets' },
            { label: 'الإحساس عند دخول البيت', key: 'res_feelings' },
            { label: 'فضفضة التخطيط', key: 'res_free_text' },
          ],
        },
      ]
    }

    if (category === 'commercial') {
      return [
        {
          title: 'تفاصيل المشروع التجاري',
          fields: [
            { label: 'مساحات خاصة', key: 'com_special_spaces' },
            { label: 'عدد الموظفين', key: 'com_staff_count' },
            { label: 'مواقف سيارات', key: 'com_parking_needed' },
            { label: 'عدد المواقف', key: 'com_parking_count' },
            { label: 'مستوى الحركة', key: 'com_activity_level' },
            { label: 'الأولوية في التصميم', key: 'com_priority' },
            { label: 'فضفضة التخطيط', key: 'com_free_text' },
          ],
        },
      ]
    }

    if (category === 'service') {
      return [
        {
          title: 'تفاصيل المشروع الخدمي',
          fields: [
            { label: 'الفئة المستفيدة', key: 'srv_target_group' },
            { label: 'عدد المستخدمين اليومي', key: 'srv_daily_users' },
            { label: 'نمط الاستخدام', key: 'srv_usage_pattern' },
            { label: 'مستوى الحركة', key: 'srv_movement_level' },
            { label: 'مستوى الخصوصية', key: 'srv_privacy_level' },
            { label: 'الفراغات الأساسية', key: 'srv_required_spaces' },
            { label: 'مداخل خاصة', key: 'srv_special_entries' },
            { label: 'عدد المواقف', key: 'srv_parking_count' },
            { label: 'اشتراطات خاصة', key: 'srv_special_requirements' },
            { label: 'فضفضة التخطيط', key: 'srv_notes' },
          ],
        },
      ]
    }

    if (category === 'touristic') {
      return [
        {
          title: 'تفاصيل المشروع السياحي',
          fields: [
            { label: 'عدد الوحدات', key: 'tour_units_count' },
            { label: 'طبيعة المشروع', key: 'tour_site_type' },
            { label: 'الفئة المستهدفة', key: 'tour_target_group' },
            { label: 'مستوى الخصوصية', key: 'tour_privacy_level' },
            { label: 'الفراغات المطلوبة', key: 'tour_required_spaces' },
            { label: 'الانطباع الأول للزائر', key: 'tour_first_impression' },
            { label: 'توجه التخطيط', key: 'tour_planning_preference' },
            { label: 'فضفضة التخطيط', key: 'tour_notes' },
          ],
        },
      ]
    }

    return []
  })()

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton
            href={session?.user?.role === 'ADMIN' ? '/admin/dashboard' : '/engineer/dashboard'}
            label="العودة للوحة التحكم"
          />
        </div>
        <h1 className="text-2xl font-bold mb-6 text-charcoal dark:text-cream">تفاصيل الطلب #{order.orderNumber}</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-charcoal dark:text-cream">
                <User className="w-5 h-5" />
                معلومات العميل
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige">الاسم</p>
                  <p className="font-semibold text-charcoal dark:text-cream">{order.client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige">البريد الإلكتروني</p>
                  <p className="font-semibold text-charcoal dark:text-cream">{order.client.email}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige">رقم الجوال</p>
                  <p className="font-semibold text-charcoal dark:text-cream">{order.client.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige">الباقة</p>
                  <p className="font-semibold text-charcoal dark:text-cream">{(order as { packageForDisplay?: { nameAr: string } }).packageForDisplay?.nameAr ?? order.package?.nameAr}</p>
                </div>
              </div>
            </Card>

            {/* Form Data */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <h2 className="text-xl font-semibold mb-4 text-charcoal dark:text-cream">بيانات الطلب</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-charcoal dark:text-cream mb-3">المعلومات الأساسية</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-gray dark:text-greige">نوع المشروع:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">{projectTypeLabel}</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">المنطقة:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">
                        {formatValue(formData.region)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">المدينة:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">{cityValue}</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">الحي:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">{districtValue}</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">مساحة الأرض:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">
                        {formatValue(formData.landArea)} م²
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">الأبعاد:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">
                        {formatValue(formData.landLength)} × {formatValue(formData.landWidth)} م
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">عدد الواجهات:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">
                        {formatValue(formData.facadeCount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">اتجاه الواجهات:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">
                        {formatValue(formData.facadeDirection)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">عدد الطوابق:</span>
                      <span className="mr-2 font-medium text-charcoal dark:text-cream">
                        {formatValue(formData.floorsCount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-charcoal dark:text-cream mb-3">نوع الاستخدام</h3>
                  <p className="text-charcoal dark:text-cream">{categoryLabelMap[category] ?? '-'}</p>
                </div>

                {detailSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="font-semibold text-charcoal dark:text-cream mb-3">{section.title}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {section.fields.map((field) => (
                        <div key={field.key}>
                          <span className="text-blue-gray dark:text-greige">{field.label}:</span>
                          <span className="mr-2 font-medium text-charcoal dark:text-cream">
                            {formatValue(formData[field.key])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {typeof formData.addonsNotes === 'string' && formData.addonsNotes.trim() !== '' && (
                  <div>
                    <h3 className="font-semibold text-charcoal dark:text-cream mb-3">إضافات مطلوبة</h3>
                    <p className="text-sm text-charcoal dark:text-cream whitespace-pre-line">
                      {formData.addonsNotes.trim()}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Upload Plan */}
            <Card>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                رفع المخطط (حد أقصى 6 ملفات)
              </h2>
              <div className="mb-4 p-4 rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-800 dark:text-amber-200 min-w-0 break-words">
                <p className="font-medium mb-1">حدود الحجم:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300 break-words">
                  <li>الملف الواحد: حد أقصى 10MB</li>
                  <li>مجموع الملفات: حد أقصى 30MB</li>
                  <li>بعد الحفظ: حد أقصى 5MB لكل ملف (يُنصح بتقليل الحجم لتسريع التحميل)</li>
                </ul>
                <p className="mt-2 text-amber-700 dark:text-amber-300 break-words">
                  يُنصح بتقليل حجم الملفات (ضغط الصور أو PDF أصغر) لتسريع الرفع والاطلاع. (تنطبق على المهندس والأدمن.)
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اختر ملفات (PDF أو صورة)
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleFileChange}
                    disabled={pendingFiles.length >= MAX_PLAN_FILES || compressing || uploading}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>

                {compressing && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700" />
                      <span className="text-sm">جاري ضغط الصور...</span>
                    </div>
                  </div>
                )}

                {uploadProgress && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      جاري رفع {uploadProgress.current} من {uploadProgress.total}
                    </span>
                  </div>
                )}

                {pendingFiles.length > 0 && !compressing && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      الملفات المختارة ({pendingFiles.length}/{MAX_PLAN_FILES})
                    </p>
                    <ul className="space-y-2">
                      {pendingFiles.map((entry, index) => (
                        <li
                          key={index}
                          className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between gap-2 min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Upload className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={entry.file.name}>
                              {entry.file.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {formatFileSize(entry.file.size)}
                              {entry.original && entry.original.size !== entry.file.size && (
                                <span className="text-green-600 dark:text-green-400 mr-1">
                                  {' '}(مضغوط)
                                </span>
                              )}
                              {entry.file.size > MAX_FILE_SIZE_AFTER_SAVE_BYTES && (
                                <span className="text-amber-600 dark:text-amber-400 mr-1" title="يتجاوز حد الحجم بعد الحفظ (5MB) — يُنصح بتقليل الحجم">
                                  (كبير)
                                </span>
                              )}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePendingFile(index)}
                            disabled={uploading}
                          >
                            <X className="w-4 h-4" />
                            حذف
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {unsentPlans.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3 min-w-0">
                      <Button
                        onClick={async () => {
                          if (whatsappUrl) handleOpenWhatsApp()
                          else {
                            try {
                              const res = await apiClient.post<{ success: boolean; whatsappUrl?: string | null }>('/whatsapp/plan-uploaded', { orderId })
                              if (res.success && res.whatsappUrl) {
                                setWhatsappUrl(res.whatsappUrl)
                                window.open(res.whatsappUrl, '_blank')
                              } else toast.error('فشل إنشاء رابط واتساب')
                            } catch { toast.error('فشل إنشاء رابط واتساب') }
                          }
                        }}
                        variant="outline"
                        className="flex-1 border-green-500 dark:border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="mr-2">إرسال للعميل عبر واتساب</span>
                      </Button>
                      <Button
                        onClick={() => handleSendPlans(unsentPlans.map((p) => p.id))}
                        disabled={sending}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-5 h-5" />
                        <span className="mr-2">{sending ? 'جاري الإرسال...' : 'إرسال المخططات للعميل'}</span>
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={pendingFiles.length === 0 || uploading || compressing}
                  className="w-full"
                >
                  <Upload className="w-5 h-5" />
                  {compressing ? 'جاري الضغط...' : uploading ? 'جاري الرفع...' : 'رفع المخططات'}
                </Button>
              </div>
            </Card>

            {/* Revision Requests */}
            {revisionRequests.length > 0 && (
              <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-charcoal dark:text-cream">
                  <Edit className="w-5 h-5" />
                  طلبات التعديل ({revisionRequests.filter(r => r.status === 'pending').length} معلقة)
                </h2>
                <div className="space-y-4">
                  {revisionRequests.map((revision) => {
                    const plan = revision.planId && order?.plans
                      ? order.plans.find((p) => p.id === revision.planId) ?? null
                      : null
                    const planLabel = plan?.fileName?.trim() || (plan ? 'مخطط (بدون اسم)' : 'مخطط غير محدد')
                    const pins = revision.pins ?? []
                    return (
                      <div
                        key={revision.id}
                        className={`border rounded-lg p-4 ${
                          revision.status === 'pending'
                            ? 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                            : revision.status === 'completed'
                            ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                            : 'border-greige/30 dark:border-charcoal-600 bg-greige/10 dark:bg-charcoal-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-charcoal dark:text-cream">
                              طلب تعديل #{revision.id.slice(-8)}
                            </p>
                            <p className="text-sm text-blue-gray dark:text-greige mt-1">
                              المخطط: {planLabel}
                            </p>
                            <p className="text-sm text-blue-gray dark:text-greige">
                              {formatDateTimeHijriMiladi(revision.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              revision.status === 'pending'
                                ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                                : revision.status === 'completed'
                                ? 'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                                : 'bg-greige/30 dark:bg-charcoal-600 text-charcoal dark:text-cream'
                            }`}
                          >
                            {revision.status === 'pending'
                              ? 'معلق'
                              : revision.status === 'completed'
                              ? 'مكتمل'
                              : revision.status === 'in_progress'
                              ? 'قيد التنفيذ'
                              : revision.status}
                          </span>
                        </div>

                        {/* Display all pins */}
                        <div className="space-y-2 mb-3">
                          <p className="text-sm font-medium text-charcoal dark:text-cream mb-2">
                            نقاط التعديل ({pins.length}):
                          </p>
                          {pins.length === 0 ? (
                            <p className="text-xs text-blue-gray dark:text-greige">لا توجد نقاط تعديل مسجلة</p>
                          ) : (
                            pins.map((pin, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-2 bg-white dark:bg-charcoal-700 rounded border border-greige/30 dark:border-charcoal-600"
                              >
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: pin.color }}
                                />
                                <div className="flex-1">
                                  <p className="text-sm text-charcoal dark:text-cream">{pin.note || '—'}</p>
                                  <p className="text-xs text-blue-gray dark:text-greige mt-1">
                                    الموقع: ({pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%)
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* View Details Link */}
                        <Link href={`/engineer/orders/${orderId}/revision/${revision.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Edit className="w-4 h-4" />
                            عرض التفاصيل الكاملة
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* سجل التغييرات */}
            {order.auditLogs && order.auditLogs.length > 0 && (
              <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
                <h2 className="text-xl font-semibold mb-4 text-charcoal dark:text-cream">سجل التغييرات</h2>
                <ul className="space-y-2 text-sm min-w-0">
                  {order.auditLogs.map((entry) => (
                    <li key={entry.id} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2 py-2 border-b border-greige/20 dark:border-charcoal-600 last:border-0 min-w-0">
                      <span className="text-blue-gray dark:text-greige shrink-0">
                        {formatDateTimeHijriMiladi(entry.createdAt)}
                      </span>
                      {entry.action === 'status_change' && (
                        <span className="text-charcoal dark:text-cream break-words min-w-0">
                          تغيير الحالة: <span className="font-medium">{entry.oldValue ?? '—'}</span> → <span className="font-medium">{entry.newValue ?? '—'}</span>
                        </span>
                      )}
                      {entry.action !== 'status_change' && (
                        <span className="text-charcoal dark:text-cream break-words min-w-0">{entry.action}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Existing Plans */}
            {order.plans && order.plans.length > 0 && (
              <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
                <h2 className="text-xl font-semibold mb-4 text-charcoal dark:text-cream">المخططات المرفوعة</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {order.plans.map((plan) => (
                    <div key={plan.id} className={`border rounded-lg p-4 bg-white dark:bg-charcoal-700 ${plan.isActive ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-greige/30 dark:border-charcoal-600'}`}>
                      {plan.fileType === 'image' ? (
                        <Image
                          src={plan.fileUrl}
                          alt="Plan"
                          width={480}
                          height={192}
                          className="w-full h-48 object-cover rounded mb-2"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                        />
                      ) : (
                        <div className="w-full h-48 bg-greige/20 dark:bg-charcoal-600 rounded flex items-center justify-center mb-2">
                          <span className="text-blue-gray dark:text-greige">PDF</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <a
                          href={`/api/orders/${orderId}/plans/${plan.id}/download`}
                          download={plan.fileName?.trim() || (plan.fileType === 'pdf' ? 'plan.pdf' : 'plan.jpeg')}
                          className="flex items-center gap-2 text-rocky-blue dark:text-rocky-blue-300 hover:underline"
                        >
                          <Download className="w-4 h-4" />
                          تحميل
                        </a>
                        <div className="flex items-center gap-2">
                          {plan.isActive && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                              تم الإرسال
                            </span>
                          )}
                          {!plan.isActive && (
                            <Button
                              onClick={() => handleDeletePlan(plan.id)}
                              disabled={deletingPlanId === plan.id}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deletingPlanId === plan.id ? 'جاري الحذف...' : 'حذف'}
                            </Button>
                          )}
                        </div>
                      </div>
                      {!plan.isActive && (
                        <div className="flex gap-2 mt-2">
                          {/* WhatsApp Button - Left */}
                          {whatsappUrl && (
                            <Button
                              onClick={async () => {
                                // Generate WhatsApp URL for this plan
                                try {
                                  const whatsappResult = await apiClient.post<{ success: boolean; whatsappUrl?: string | null }>('/whatsapp/plan-uploaded', {
                                    orderId,
                                  })
                                  if (whatsappResult.success && whatsappResult.whatsappUrl) {
                                    window.open(whatsappResult.whatsappUrl, '_blank')
                                  }
                                } catch {
                                  toast.error('فشل إنشاء رابط واتساب')
                                }
                              }}
                              variant="outline"
                              className="flex-1 border-green-500 dark:border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                              size="sm"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="mr-1">واتساب</span>
                            </Button>
                          )}
                          {/* Send Button - Right */}
                          <Button
                            onClick={() => handleSendPlans([plan.id])}
                            disabled={sending}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Send className="w-4 h-4" />
                            <span className="mr-1">{sending ? 'جاري الإرسال...' : 'إرسال للعميل'}</span>
                          </Button>
                        </div>
                      )}
                      {plan.isActive && whatsappUrl && (
                        <Button
                          onClick={handleOpenWhatsApp}
                          variant="outline"
                          className="w-full mt-2 border-green-500 text-green-600 hover:bg-green-50"
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="mr-1">إرسال رسالة واتساب</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Status */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <h3 className="font-semibold mb-4 text-charcoal dark:text-cream">حالة الطلب</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal dark:text-cream mb-2">
                    تغيير الحالة:
                  </label>
                  <div className="relative">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={updatingStatus}
                      className="w-full px-4 py-2 pr-10 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:border-transparent appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="PENDING">في الانتظار</option>
                      <option value="IN_PROGRESS">قيد التنفيذ</option>
                      <option value="REVIEW">قيد المراجعة</option>
                      <option value="COMPLETED">مكتمل</option>
                      <option value="CLOSED">منتهي</option>
                      <option value="ARCHIVED">مؤرشف</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-gray dark:text-greige pointer-events-none" />
                  </div>
                  {updatingStatus && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-gray dark:text-greige">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rocky-blue"></div>
                      <span>جاري التحديث...</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-greige/30 dark:border-charcoal-600">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-gray dark:text-greige">الحالة الحالية:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-greige/30 dark:border-charcoal-600">
                  <span className="text-sm text-blue-gray dark:text-greige flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    الموعد النهائي:
                  </span>
                  <span className="font-semibold text-charcoal dark:text-cream">
                    {formatDateHijriMiladi(order.deadline)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <h3 className="font-semibold mb-4 text-charcoal dark:text-cream">الإجراءات</h3>
              <div className="space-y-3">
                {order.status === 'PENDING' && (
                  <Button
                    onClick={handleStartOrder}
                    className="w-full"
                  >
                    بدء العمل على الطلب
                  </Button>
                )}
                <Link href={`/engineer/orders/${orderId}/chat`} className="block">
                  <Button variant="outline" className="w-full">
                    فتح المحادثة
                  </Button>
                </Link>
                {order.status === 'IN_PROGRESS' && (
                  <button
                    onClick={async () => {
                      const days = prompt('كم يوم تريد إضافة؟ (1-30)')
                      if (days && parseInt(days) >= 1 && parseInt(days) <= 30) {
                        try {
                          const result = await apiClient.post<{ success: boolean; message?: string }>(`/engineer/orders/${orderId}/extend`, {
                            days: parseInt(days),
                          })
                          if (result.success) {
                            toast.success(result.message || 'تم تمديد الموعد النهائي')
                            fetchOrder()
                          }
                        } catch (error: unknown) {
                          const errorMessage = error instanceof Error ? error.message : 'فشل تمديد الموعد'
                          toast.error(errorMessage)
                        }
                      }
                    }}
                    className="w-full px-4 py-2 text-sm border border-greige/30 dark:border-charcoal-600 rounded-lg hover:bg-greige/10 dark:hover:bg-charcoal-700 text-charcoal dark:text-cream"
                  >
                    تمديد الموعد النهائي
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
