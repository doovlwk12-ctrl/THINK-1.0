'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Users, Mail, Phone, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { Button } from '@/components/shared/Button'
import { apiClient } from '@/lib/api'
import { formatDateHijriMiladi } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Engineer {
  id: string
  name: string
  email: string
  phone: string
  isActive: boolean
  ordersCount: number
  completedOrdersCount: number
  createdAt: string
}

export default function AdminEngineersPage() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEngineers = useCallback(async () => {
    try {
      setLoading(true)
      const result = await apiClient.get<{ success: boolean; users: Engineer[] }>('/admin/users?role=ENGINEER')
      
      if (result.success && result.users) {
        setEngineers(result.users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || 'غير متوفر',
          isActive: true, // TODO: Add isActive field to User model
          ordersCount: user.ordersCount || 0,
          completedOrdersCount: user.completedOrdersCount || 0,
          createdAt: user.createdAt,
        })))
      }
    } catch (error: unknown) {
      console.error('Failed to fetch engineers:', error)
      toast.error('فشل تحميل قائمة المهندسين')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInvite = async () => {
    // Future feature - disabled for now
    toast.error('هذه الميزة غير متاحة حالياً. ستكون متاحة في تحديثات مستقبلية')
    return
  }

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
      fetchEngineers()
    }
  }, [status, session, router, fetchEngineers])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <BackButton href="/admin/dashboard" label="العودة للوحة التحكم" />
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">إدارة المهندسين</h1>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/admin/engineers/applications')}
            >
              طلبات الانضمام
            </Button>
            <Button 
              onClick={handleInvite} 
              disabled={true}
              title="هذه الميزة ستكون متاحة في تحديثات مستقبلية"
            >
              <UserPlus className="w-5 h-5" />
              إنشاء رابط دعوة (ميزة مستقبلية)
            </Button>
          </div>
        </div>

        {/* Future Feature Notice */}
        <Card className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ميزة مستقبلية
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                ميزة إنشاء رابط دعوة للمهندسين ستكون متاحة في تحديثات مستقبلية. حالياً يمكنك إدارة المهندسين الموجودين ومراجعة طلبات الانضمام من صفحة &quot;طلبات الانضمام&quot;.
              </p>
            </div>
          </div>
        </Card>

        {engineers.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">لا يوجد مهندسين مسجلين بعد</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {engineers.map((engineer) => (
              <Card key={engineer.id} className="hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {engineer.name}
                      </h3>
                      {engineer.isActive ? (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          نشط
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full text-xs font-medium flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          غير نشط
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {engineer.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {engineer.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الطلبات</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {engineer.ordersCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">المكتملة</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {engineer.completedOrdersCount}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      انضم في {formatDateHijriMiladi(engineer.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
