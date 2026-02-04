'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Users, FileText, TrendingUp, Clock, CheckCircle, UserCheck, Box, Settings } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

interface Stats {
  totalOrders: number
  totalUsers: number
  totalClients: number
  totalEngineers: number
  activeEngineers: number
  totalRevenue: number
  recentRevenue: number
  pendingOrders: number
  inProgressOrders: number
  completedOrders: number
  recentOrders: number
  totalPackages: number
  activePackages: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const result = await apiClient.get<{ success: boolean; stats: Stats; error?: string }>('/admin/stats')
      
      if (result.success && result.stats) {
        setStats(result.stats)
      } else {
        const errorMessage = result.error || 'فشل تحميل الإحصائيات'
        console.error('Failed to fetch stats:', errorMessage)
        toast.error(errorMessage)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل الإحصائيات'
      console.error('Failed to fetch stats:', error)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      fetchStats()
    }
  }, [status, session, router, fetchStats])

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
        <BackButton href="/" label="العودة للصفحة الرئيسية" />
        
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-charcoal dark:text-cream">لوحة تحكم الإدارة</h1>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.totalOrders || 0}</p>
                {stats && stats.recentOrders > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{stats.recentOrders} آخر 7 أيام
                  </p>
                )}
              </div>
              <FileText className="w-10 h-10 text-rocky-blue dark:text-rocky-blue-300" />
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.totalUsers || 0}</p>
                {stats && (
                  <p className="text-xs text-blue-gray dark:text-greige mt-1">
                    {stats.totalClients} عميل • {stats.totalEngineers} مهندس
                  </p>
                )}
              </div>
              <Users className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.totalRevenue?.toLocaleString('ar-SA') || 0} ريال</p>
                {stats && stats.recentRevenue > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stats.recentRevenue.toLocaleString('ar-SA')} ريال آخر 30 يوم
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <span className="text-yellow-700 dark:text-yellow-400 font-bold text-lg leading-none">ر</span>
                <span className="text-yellow-600 dark:text-yellow-500 font-semibold text-xs leading-none mt-0.5">.س</span>
              </div>
            </div>
          </Card>

          <Card className="hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">المهندسين النشطين</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.activeEngineers || 0}</p>
                {stats && stats.totalEngineers > 0 && (
                  <p className="text-xs text-blue-gray dark:text-greige mt-1">
                    من أصل {stats.totalEngineers} مهندس
                  </p>
                )}
              </div>
              <UserCheck className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>
        </div>

        {/* Order Status Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-yellow-500 dark:border-l-yellow-600 hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">الطلبات المعلقة</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.pendingOrders || 0}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-blue-500 dark:border-l-blue-600 hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">قيد التنفيذ</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.inProgressOrders || 0}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500 dark:border-l-green-600 hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">المكتملة</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.completedOrders || 0}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </Card>
        </div>

        {/* Packages Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">إجمالي الباقات</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.totalPackages ?? 0}</p>
                {stats && (
                  <p className="text-xs text-blue-gray dark:text-greige mt-1">
                    {stats.activePackages ?? 0} نشطة • {(stats.totalPackages ?? 0) - (stats.activePackages ?? 0)} غير نشطة
                  </p>
                )}
              </div>
              <Box className="w-10 h-10 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>
          <Card className="hover:shadow-lg transition-shadow dark:bg-charcoal-800 dark:border-charcoal-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-gray dark:text-greige mb-1">الباقات النشطة</p>
                <p className="text-2xl font-bold text-charcoal dark:text-cream">{stats?.activePackages ?? 0}</p>
                <p className="text-xs text-blue-gray dark:text-greige mt-1">المتاحة للعملاء</p>
              </div>
              <Box className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-600 dark:bg-charcoal-800 dark:border-charcoal-600" onClick={() => router.push('/admin/packages')}>
            <div className="flex items-center gap-3 mb-3">
              <Box className="w-8 h-8 text-rocky-blue dark:text-rocky-blue-300" />
              <h3 className="text-xl font-semibold text-charcoal dark:text-cream">إدارة الباقات</h3>
            </div>
            <p className="text-blue-gray dark:text-greige text-sm">إضافة وتعديل وحذف الباقات</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-600 dark:bg-charcoal-800 dark:border-charcoal-600" onClick={() => router.push('/admin/orders')}>
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-rocky-blue dark:text-rocky-blue-300" />
              <h3 className="text-xl font-semibold text-charcoal dark:text-cream">جميع الطلبات</h3>
            </div>
            <p className="text-blue-gray dark:text-greige text-sm">عرض وإدارة جميع الطلبات</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-600 dark:bg-charcoal-800 dark:border-charcoal-600" onClick={() => router.push('/admin/engineers')}>
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-8 h-8 text-rocky-blue dark:text-rocky-blue-300" />
              <h3 className="text-xl font-semibold text-charcoal dark:text-cream">إدارة المهندسين</h3>
            </div>
            <p className="text-blue-gray dark:text-greige text-sm">عرض وإدارة المهندسين</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-600 dark:bg-charcoal-800 dark:border-charcoal-600" onClick={() => router.push('/admin/settings/pin-pack')}>
            <div className="flex items-center gap-3 mb-3">
              <Settings className="w-8 h-8 text-rocky-blue dark:text-rocky-blue-300" />
              <h3 className="text-xl font-semibold text-charcoal dark:text-cream">سعر مجموعة الدبابيس</h3>
            </div>
            <p className="text-blue-gray dark:text-greige text-sm">سعر وخصم ورسائل مجموعة الدبابيس في صفحة التعديل</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-600 dark:bg-charcoal-800 dark:border-charcoal-600" onClick={() => router.push('/admin/settings/revisions-purchase')}>
            <div className="flex items-center gap-3 mb-3">
              <Settings className="w-8 h-8 text-rocky-blue dark:text-rocky-blue-300" />
              <h3 className="text-xl font-semibold text-charcoal dark:text-cream">سعر والحد الأقصى لشراء التعديلات</h3>
            </div>
            <p className="text-blue-gray dark:text-greige text-sm">تعديل سعر التعديل الواحد والحد الأقصى لعدد التعديلات في عملية شراء واحدة</p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-600 dark:bg-charcoal-800 dark:border-charcoal-600" onClick={() => router.push('/admin/content/homepage')}>
            <div className="flex items-center gap-3 mb-3">
              <FileText className="w-8 h-8 text-rocky-blue dark:text-rocky-blue-300" />
              <h3 className="text-xl font-semibold text-charcoal dark:text-cream">محتوى الصفحة الرئيسية</h3>
            </div>
            <p className="text-blue-gray dark:text-greige text-sm">تحرير نصوص الهيرو والأسئلة الشائعة والفوتر وروابط السوشيال ميديا</p>
          </Card>
        </div>
      </main>
    </div>
  )
}
