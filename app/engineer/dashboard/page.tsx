'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Package, Clock, MessageSquare, Filter } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { apiClient } from '@/lib/api'
import { formatDateHijriMiladi } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Order {
  id: string
  orderNumber: string
  status: string
  engineerId: string | null
  client: {
    name: string
    email: string
    phone: string
  }
  package: {
    nameAr: string
    price: number
  }
  deadline: string
  createdAt: string
}

export default function EngineerDashboard() {
  const { data: session, status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('newest') // newest | oldest | deadline_asc | deadline_desc

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ sortBy })
      const result = await apiClient.get<{ success: boolean; orders: Order[] }>(`/engineer/orders?${params.toString()}`)
      if (result.success) {
        setOrders(result.orders)
      }
    } catch {
      toast.error('فشل تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [sortBy])

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
      fetchOrders()
    }
  }, [status, session, router, fetchOrders, pathname]) // Re-fetch when pathname changes (navigation)

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

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-charcoal dark:text-cream">لوحة تحكم المهندس</h1>
          {orders.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-5 h-5 text-blue-gray dark:text-greige shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-rocky-blue"
                title="ترتيب حسب الوقت"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
                <option value="deadline_asc">أقل مدة تنفيذ (الأقرب موعداً)</option>
                <option value="deadline_desc">أكثر مدة تنفيذ (الأبعد موعداً)</option>
              </select>
            </div>
          )}
        </div>

        {orders.length === 0 ? (
          <Card className="text-center py-12 dark:bg-charcoal-800 dark:border-charcoal-600">
            <Package className="w-16 h-16 text-blue-gray dark:text-greige mx-auto mb-4" />
            <p className="text-blue-gray dark:text-greige">لا توجد طلبات بعد</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => {
              const isUnassigned = !order.engineerId
              return (
                <Card key={order.id} className={`dark:bg-charcoal-800 dark:border-charcoal-600 ${isUnassigned ? 'border-2 border-rocky-blue dark:border-rocky-blue-400' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-charcoal dark:text-cream">طلب #{order.orderNumber}</h3>
                        {isUnassigned && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium">
                            غير معين
                          </span>
                        )}
                      </div>
                      <p className="text-blue-gray dark:text-greige mb-1">العميل: {order.client.name}</p>
                      <p className="text-sm text-blue-gray dark:text-greige">{order.client.email} | {order.client.phone}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-gray dark:text-greige">
                    <Clock className="w-5 h-5" />
                    <span>الموعد النهائي: {formatDateHijriMiladi(order.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-gray dark:text-greige">
                    <Package className="w-5 h-5" />
                    <span>{(order as { packageForDisplay?: { nameAr: string } }).packageForDisplay?.nameAr ?? order.package?.nameAr}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link href={`/engineer/orders/${order.id}`}>
                    <Button>عرض التفاصيل</Button>
                  </Link>
                  {!isUnassigned && (
                    <Link href={`/engineer/orders/${order.id}/chat`}>
                      <Button variant="outline">
                        <MessageSquare className="w-4 h-4" />
                        المحادثة
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
