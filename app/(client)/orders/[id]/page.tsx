'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { PlanImage } from '@/components/shared/PlanImage'
import { Clock, Package, User, MessageSquare, Edit, RefreshCw } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { formatDateHijriMiladi, formatDateTimeHijriMiladi, isOrderExpired } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Order {
  id: string
  orderNumber: string
  status: string
  client: {
    name: string
    email: string
    phone: string
  }
  engineer?: {
    name: string
    email: string
  }
  package: {
    nameAr: string
    price: number
  }
  formData: string
  remainingRevisions: number
  deadline: string
  plans: Array<{
    id: string
    fileUrl: string | null
    fileType: string
    fileName?: string | null
    createdAt: string
  }>
  plansPurgedAt?: string | null
  isExpired?: boolean
}

interface RevisionRequest {
  id: string
  orderId: string
  planId: string | null
  pins: Array<{ x: number; y: number; color: string; note: string }>
  status: string
  createdAt: string
  updatedAt: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useAuth()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<Order | null>(null)
  const [revisionRequests, setRevisionRequests] = useState<RevisionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [orderResult, revisionsResult] = await Promise.all([
        apiClient.get<{ success: boolean; order: Order }>(`/orders/${orderId}`),
        apiClient.get<{ success: boolean; revisionRequests: RevisionRequest[] }>(`/revisions/${orderId}`),
      ])
      if (orderResult.success && orderResult.order) {
        setOrder(orderResult.order)
      }
      if (revisionsResult.success && revisionsResult.revisionRequests) {
        setRevisionRequests(revisionsResult.revisionRequests)
      }
      if (!orderResult.success || !orderResult.order) {
        throw new Error('فشل تحميل الطلب')
      }
      if (silent) toast.success('تم تحديث البيانات')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل بيانات الطلب'
      toast.error(errorMessage)
      if (!silent) {
        const dashboardPath = session?.user?.role === 'ADMIN' ? '/admin/dashboard' :
                              session?.user?.role === 'ENGINEER' ? '/engineer/dashboard' :
                              '/dashboard'
        router.push(dashboardPath)
      }
    } finally {
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }, [orderId, router, session])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchOrder()
    }
  }, [status, router, fetchOrder, orderId]) // Re-fetch when orderId changes (navigation)

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
    const text = String(value).trim()
    return text === '' ? '-' : text
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
  const expired = order.isExpired !== undefined ? order.isExpired : isOrderExpired(order.deadline)
  const isClosed = order.status === 'CLOSED'
  const isArchived = (order.status === 'ARCHIVED' || expired) && !isClosed

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
        return 'منتهي الوقت'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <BackButton 
              href={
                session?.user?.role === 'ADMIN' ? '/admin/dashboard' :
                session?.user?.role === 'ENGINEER' ? '/engineer/dashboard' :
                '/dashboard'
              } 
              label="العودة للوحة التحكم" 
            />
            <h1 className="text-2xl font-bold text-charcoal dark:text-cream">تفاصيل الطلب #{order.orderNumber}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setRefreshing(true)
                fetchOrder(true)
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث البيانات
            </Button>
            {!isArchived ? (
              <Link href={`/orders/${orderId}/chat`}>
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4" />
                  المحادثة
                </Button>
              </Link>
            ) : (
              <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-semibold">انتهى وقت الطلب</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold mb-2 text-charcoal dark:text-cream">حالة الطلب</h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    {isArchived && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                        منتهي الوقت
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-gray dark:text-greige">التعديلات المتبقية</p>
                  <p className={`text-2xl font-bold ${isArchived ? 'text-gray-400 dark:text-gray-600' : 'text-rocky-blue dark:text-rocky-blue-300'}`}>
                    {order.remainingRevisions}
                  </p>
                </div>
              </div>
              {isArchived && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                    <strong>ملاحظة:</strong> انتهى وقت الطلب. يمكنك فقط عرض وتحميل المخططات.
                  </p>
                  <Button
                    onClick={async () => {
                      if (confirm('هل تريد شراء تمديد لمدة يوم واحد (100 ريال)؟ سيتم إضافة تعديل واحد وإعادة تفعيل الطلب.')) {
                        try {
                          const result = await apiClient.post<{ success: boolean; message: string }>(`/orders/${orderId}/buy-extension`)
                          if (result.success) {
                            toast.success(result.message)
                            fetchOrder()
                          }
                        } catch (error: unknown) {
                          const errorMessage = error instanceof Error ? error.message : 'فشل شراء التمديد'
                          toast.error(errorMessage)
                        }
                      }
                    }}
                    className="w-full"
                  >
                    شراء تمديد (يوم واحد + تعديل واحد) - 100 ريال
                  </Button>
                </div>
              )}
            </Card>

            {/* Package Info */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-charcoal dark:text-cream">
                <Package className="w-5 h-5" />
                معلومات الباقة
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige">الباقة</p>
                  <p className="font-semibold text-charcoal dark:text-cream">{order.package.nameAr}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige">السعر</p>
                  <p className="font-semibold text-charcoal dark:text-cream">{order.package.price} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-blue-gray dark:text-greige">الموعد النهائي</p>
                  <p className="font-semibold flex items-center gap-1 text-charcoal dark:text-cream">
                    <Clock className="w-4 h-4" />
                    {formatDateHijriMiladi(order.deadline)}
                  </p>
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

            {/* Plans */}
            {order.plans && order.plans.length > 0 && (
              <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
                <h2 className="text-xl font-semibold mb-4 text-charcoal dark:text-cream">المخططات المرفوعة</h2>
                {order.plansPurgedAt || order.plans.every((p) => !p.fileUrl) ? (
                  <div className="rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">تم حذف الملفات من الأرشيف</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      يظهر الطلب في الأرشيف فقط كسجل — كان فيه طلب ومخططات سابقة، ولا يمكن تحميل المخططات بعد 45 يوماً من الموعد النهائي. احتفظ بنسخة من الملفات لديك قبل انتهاء المدة.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {order.plans.filter((p) => p.fileUrl).map((plan) => (
                      <div key={plan.id} className="border border-greige/30 dark:border-charcoal-600 rounded-lg p-4 bg-white dark:bg-charcoal-700">
                        {plan.fileType === 'image' && plan.fileUrl ? (
                          <PlanImage
                            fileUrl={plan.fileUrl}
                            fileType={plan.fileType}
                            alt="Plan"
                            width={480}
                            height={192}
                            className="w-full h-48 object-cover rounded mb-2"
                            loading="lazy"
                            placeholder="blur"
                          />
                        ) : plan.fileUrl ? (
                          <div className="w-full h-48 bg-greige/20 dark:bg-charcoal-600 rounded flex items-center justify-center mb-2">
                            <span className="text-blue-gray dark:text-greige">PDF</span>
                          </div>
                        ) : null}
                        <a
                          href={`/api/orders/${orderId}/plans/${plan.id}/download`}
                          download={plan.fileName?.trim() || (plan.fileType === 'pdf' ? 'plan.pdf' : 'plan.jpeg')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-rocky-blue dark:text-rocky-blue-300 hover:underline text-sm"
                        >
                          تحميل المخطط
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Modification Requests - يظهر دائماً ليعرف العميل/المهندس آخر التعديلات */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-charcoal dark:text-cream">
                <Edit className="w-5 h-5" />
                طلبات التعديل
                {revisionRequests.length > 0 && (
                  <span className="text-sm font-normal text-blue-gray dark:text-greige">
                    ({revisionRequests.filter((r) => r.status === 'pending').length} معلقة)
                  </span>
                )}
              </h2>
              {revisionRequests.length === 0 ? (
                <p className="text-sm text-blue-gray dark:text-greige py-2">لا توجد طلبات تعديل بعد.</p>
              ) : (
                <div className="space-y-4">
                  {revisionRequests.map((revision) => {
                    const plan =
                      revision.planId && order.plans
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
                        <div className="space-y-2">
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
                        {(session?.user?.role === 'ADMIN' || session?.user?.role === 'ENGINEER') && (
                          <Link href={`/engineer/orders/${orderId}/revision/${revision.id}`} className="block mt-3">
                            <Button variant="outline" size="sm" className="w-full">
                              <Edit className="w-4 h-4" />
                              عرض التفاصيل الكاملة
                            </Button>
                          </Link>
                        )}
                        {session?.user?.role !== 'ADMIN' && session?.user?.role !== 'ENGINEER' && (
                          <Link href={`/orders/${orderId}/chat`} className="block mt-3">
                            <Button variant="outline" size="sm" className="w-full">
                              <MessageSquare className="w-4 h-4" />
                              فتح المحادثة
                            </Button>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Engineer Info */}
            {order.engineer && (
              <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-charcoal dark:text-cream">
                  <User className="w-5 h-5" />
                  المهندس المعين
                </h3>
                <div className="space-y-2">
                  <p className="font-semibold text-charcoal dark:text-cream">{order.engineer.name}</p>
                  <p className="text-sm text-blue-gray dark:text-greige">{order.engineer.email}</p>
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <h3 className="font-semibold mb-4 text-charcoal dark:text-cream">إجراءات سريعة</h3>
              <div className="space-y-2">
                {order.status === 'CLOSED' ? (
                  <div className="p-3 bg-slate-100 dark:bg-charcoal-700 rounded-lg text-center">
                    <p className="text-sm text-slate-700 dark:text-slate-300">الطلب منتهي. لا يمكن طلب تعديلات أو إغلاقه مرة أخرى.</p>
                  </div>
                ) : !isArchived ? (
                  <>
                    <Link href={`/orders/${orderId}/chat`} className="block">
                      <Button variant="outline" className="w-full">
                        <MessageSquare className="w-4 h-4" />
                        فتح المحادثة
                      </Button>
                    </Link>
                    {session?.user?.role === 'CLIENT' && (order.status === 'REVIEW' || order.status === 'COMPLETED') && order.remainingRevisions > 0 && order.plans && order.plans.length > 0 && (
                      <Link href={`/orders/${orderId}/revision`} className="block">
                        <Button className="w-full">
                          <Edit className="w-4 h-4" />
                          طلب تعديل
                        </Button>
                      </Link>
                    )}
                    {session?.user?.role === 'CLIENT' && (order.status === 'REVIEW' || order.status === 'COMPLETED') && order.remainingRevisions === 0 && (
                      <Link href={`/orders/${orderId}/buy-revisions`} className="block">
                        <Button variant="outline" className="w-full">
                          شراء تعديلات إضافية
                        </Button>
                      </Link>
                    )}
                    {session?.user?.role === 'CLIENT' && order.status === 'COMPLETED' && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          if (confirm('هل أنت متأكد من إنهاء الطلب؟ بعد التأكيد لا يمكنك طلب تعديلات إضافية.')) {
                            try {
                              const result = await apiClient.post<{ success: boolean; message: string }>(`/orders/${orderId}/complete`)
                              if (result.success) {
                                toast.success(result.message)
                                fetchOrder()
                              }
                            } catch (error: unknown) {
                              const err = error as { error?: string }
                              toast.error(err?.error ?? 'فشل تأكيد إنهاء الطلب')
                            }
                          }
                        }}
                      >
                        تأكيد إنهاء الطلب
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-100 dark:bg-charcoal-700 rounded-lg text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">المحادثة والتعديلات غير متاحة</p>
                      {session?.user?.role === 'CLIENT' && (
                        <Button
                          onClick={async () => {
                            if (confirm('هل تريد شراء تمديد لمدة يوم واحد (100 ريال)؟ سيتم إضافة تعديل واحد وإعادة تفعيل الطلب.')) {
                              try {
                                const result = await apiClient.post<{ success: boolean; message: string }>(`/orders/${orderId}/buy-extension`)
                                if (result.success) {
                                  toast.success(result.message)
                                  fetchOrder()
                                }
                              } catch (error: unknown) {
                                const errorMessage = error instanceof Error ? error.message : 'فشل شراء التمديد'
                                toast.error(errorMessage)
                              }
                            }
                          }}
                          className="w-full"
                        >
                          شراء تمديد (يوم + تعديل) - 100 ريال
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
