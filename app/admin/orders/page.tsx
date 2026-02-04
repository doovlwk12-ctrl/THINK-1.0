'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { Filter, Upload } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { Button } from '@/components/shared/Button'
import { apiClient } from '@/lib/api'
import { formatDateHijriMiladi } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  deadline: string
  client: {
    name: string
    email: string
  }
  engineer?: {
    name: string
    email: string
  }
  package?: {
    nameAr: string
    price: number
  } | null
  /** من الـ API لعرض الباقة حتى لو حُذفت لاحقاً */
  packageForDisplay?: {
    nameAr: string
    price: number
  }
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('newest') // newest | oldest | deadline_asc | deadline_desc

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      params.append('sortBy', sortBy)

      const result = await apiClient.get<{
        success: boolean
        orders: Order[]
        pagination: { totalPages: number }
      }>(`/admin/orders?${params.toString()}`)
      
      if (result.success) {
        setOrders(result.orders)
        setTotalPages(result.pagination.totalPages)
      }
    } catch {
      toast.error('فشل تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, sortBy])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    // لا توجّه حتى يُحمّل الدور من /api/auth/me (يتجنب توجيه الأدمن للوحة العميل بالخطأ)
    if (status === 'authenticated' && session?.user?.role != null) {
      if (session.user.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      fetchOrders()
    }
  }, [status, session, session?.user?.role, router, fetchOrders])

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
        <BackButton href="/admin/dashboard" label="العودة للوحة التحكم" />
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-charcoal dark:text-cream">جميع الطلبات</h1>
          
          {/* Filters: Status + Sort by time */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-5 h-5 text-blue-gray dark:text-greige shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-rocky-blue"
            >
              <option value="">جميع الحالات</option>
              <option value="PENDING">في الانتظار</option>
              <option value="IN_PROGRESS">قيد التنفيذ</option>
              <option value="REVIEW">قيد المراجعة</option>
              <option value="COMPLETED">مكتمل</option>
              <option value="CLOSED">منتهي</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream focus:outline-none focus:ring-2 focus:ring-rocky-blue"
              title="ترتيب حسب الوقت"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="deadline_asc">أقل مدة تنفيذ (الأقرب موعداً)</option>
              <option value="deadline_desc">أكثر مدة تنفيذ (الأبعد موعداً)</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="dark:bg-charcoal-800 dark:border-charcoal-600">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-charcoal dark:text-cream">#{order.orderNumber}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-gray dark:text-greige">العميل:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{order.client.name}</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">المهندس:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">
                        {order.engineer?.name || 'غير معين'}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">الباقة:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{order.packageForDisplay?.nameAr ?? order.package?.nameAr ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">السعر:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{order.packageForDisplay?.price ?? order.package?.price ?? 0} ريال</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">تاريخ الإنشاء:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{formatDateHijriMiladi(order.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-blue-gray dark:text-greige">الموعد النهائي:</span>
                      <span className="font-semibold mr-2 text-charcoal dark:text-cream">{formatDateHijriMiladi(order.deadline)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/engineer/orders/${order.id}`}>
                    <Button variant="outline" size="sm" title="تفاصيل الطلب ورفع المخطط — نفس حدود الحجم (10MB/ملف، 30MB مجموع، 5MB بعد الحفظ) تنطبق على الأدمن أيضاً">
                      <Upload className="w-4 h-4" />
                      تفاصيل ورفع مخطط
                    </Button>
                  </Link>
                  <Link href={`/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      عرض كعميل
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              السابق
            </Button>
            <span className="px-4 py-2 text-gray-900 dark:text-gray-100">
              صفحة {page} من {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              التالي
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
