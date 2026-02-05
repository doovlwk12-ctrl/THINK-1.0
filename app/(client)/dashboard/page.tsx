'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus, Clock, MessageSquare, Edit } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { useMyOrders } from '@/hooks/useMyOrders'
import { formatDateHijriMiladi, isOrderExpired } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ClientDashboard() {
  const { status, data: session } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const roleReady = status === 'authenticated' && session?.user?.role != null
  const enabled = status === 'authenticated' && session?.user?.role !== 'ENGINEER' && session?.user?.role !== 'ADMIN'
  const { orders, error: ordersError, isLoading: loading, mutate } = useMyOrders(enabled)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }

    if (status === 'authenticated' && session?.user?.role != null) {
      if (session.user.role === 'ENGINEER') {
        router.replace('/engineer/dashboard')
        return
      }
      if (session.user.role === 'ADMIN') {
        router.replace('/admin/dashboard')
        return
      }
    }
  }, [status, session?.user?.role, pathname, router])

  useEffect(() => {
    if (ordersError) toast.error(ordersError)
  }, [ordersError])

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

  if (status === 'loading' || status === 'unauthenticated' || !roleReady || loading) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text={status === 'unauthenticated' ? 'جاري التحويل لتسجيل الدخول...' : 'جاري التحميل...'} />
      </div>
    )
  }

  if (session?.user?.role === 'ENGINEER' || session?.user?.role === 'ADMIN') {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحويل للوحة التحكم..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-charcoal dark:text-cream mb-2">لوحة تحكم العميل</h1>
            <p className="text-sm sm:text-base text-blue-gray dark:text-greige">إدارة طلباتك ومتابعة حالة مشاريعك</p>
          </div>
          <Link href="/orders/select-package" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="w-5 h-5" />
              طلب جديد
            </Button>
          </Link>
        </div>

        {ordersError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-red-700 dark:text-red-300">{ordersError}</span>
            <Button variant="outline" size="sm" onClick={() => mutate()}>إعادة المحاولة</Button>
          </div>
        )}
        {!ordersError && orders.length === 0 ? (
          <Card className="text-center py-12 dark:bg-charcoal-800 dark:border-charcoal-600">
            <Package className="w-16 h-16 text-blue-gray dark:text-greige mx-auto mb-4" />
            <p className="text-blue-gray dark:text-greige mb-4">لا توجد طلبات بعد</p>
            <Link href="/orders/select-package">
              <Button>إنشاء طلب جديد</Button>
            </Link>
          </Card>
        ) : !ordersError ? (
          <div className="grid gap-6">
            {orders.map((order) => {
              const expired = isOrderExpired(order.deadline)
              const isClosed = order.status === 'CLOSED'
              const isArchived = (order.status === 'ARCHIVED' || expired) && !isClosed
              
              return (
              <Card key={order.id} className={`hover:shadow-lg transition-shadow duration-200 dark:bg-charcoal-800 dark:border-charcoal-600 ${isArchived ? 'opacity-75 border-2 border-gray-300 dark:border-gray-700' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-charcoal dark:text-cream">طلب #{order.orderNumber}</h3>
                      {isArchived && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                          منتهي الوقت
                        </span>
                      )}
                    </div>
                    <p className="text-blue-gray dark:text-greige">{order.package.nameAr}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 pb-4 border-b border-greige/30 dark:border-charcoal-600">
                  <div className="flex items-center gap-2 text-blue-gray dark:text-greige">
                    <Clock className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300 flex-shrink-0" />
                    <span className="text-sm">الموعد النهائي: {formatDateHijriMiladi(order.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-gray dark:text-greige">
                    <Package className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300 flex-shrink-0" />
                    <span className="text-sm">التعديلات المتبقية: <span className={`font-semibold ${order.remainingRevisions === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rocky-blue dark:text-rocky-blue-300'}`}>{order.remainingRevisions}</span></span>
                    {!isArchived && order.remainingRevisions === 0 && (order.status === 'IN_PROGRESS' || order.status === 'REVIEW' || order.status === 'COMPLETED') && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 block mt-0.5">شراء تعديلات يضيف يوم تنفيذ لكل تعديل</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-blue-gray dark:text-greige">
                    <span className="text-sm font-semibold text-charcoal dark:text-cream">السعر: <span className="text-rocky-blue dark:text-rocky-blue-300">{order.package.price} ريال</span></span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!isArchived ? (
                    <>
                      <Link href={`/orders/${order.id}/chat`} className="flex-1 min-w-[120px]">
                        <Button variant="outline" size="sm" className="w-full">
                          <MessageSquare className="w-4 h-4" />
                          المحادثة
                        </Button>
                      </Link>
                      <Link href={`/orders/${order.id}`} className="flex-1 min-w-[120px]">
                        <Button variant="secondary" size="sm" className="w-full">
                          التفاصيل
                        </Button>
                      </Link>
                      {(order.status === 'IN_PROGRESS' || order.status === 'REVIEW' || order.status === 'COMPLETED') && order.remainingRevisions === 0 && (
                        <Link href={`/orders/${order.id}/buy-revisions`} className="flex-1 min-w-[120px]">
                          <Button size="sm" className="w-full">
                            <Edit className="w-4 h-4" />
                            شراء تعديلات
                          </Button>
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link href={`/orders/${order.id}`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          عرض التفاصيل
                        </Button>
                      </Link>
                      <div className="flex-1 text-center text-sm text-blue-gray dark:text-greige flex items-center justify-center">
                        المحادثة والتعديلات غير متاحة
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )})}
          </div>
        ) : null}
      </main>
    </div>
  )
}
