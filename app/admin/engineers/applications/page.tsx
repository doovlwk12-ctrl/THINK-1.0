'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { FileText, Mail, Phone, Clock, CheckCircle, XCircle, Eye, X } from 'lucide-react'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { Button } from '@/components/shared/Button'
import { apiClient } from '@/lib/api'
import { formatDateTimeHijriMiladi } from '@/lib/utils'
import toast from 'react-hot-toast'

interface EngineerApplication {
  id: string
  name: string
  email: string
  phone: string
  status: 'pending' | 'approved' | 'rejected'
  adminNotes: string | null
  createdAt: string
  reviewedAt: string | null
  adminId: string | null
}

export default function AdminEngineerApplicationsPage() {
  const router = useRouter()
  const { data: session, status } = useAuth()
  const [applications, setApplications] = useState<EngineerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedApplication, setSelectedApplication] = useState<EngineerApplication | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true)
      const statusParam = filter === 'all' ? null : filter
      const url = statusParam ? `/admin/engineers/applications?status=${statusParam}` : '/admin/engineers/applications'
      const result = await apiClient.get<{ success: boolean; applications: EngineerApplication[] }>(url)
      
      if (result.success && result.applications) {
        setApplications(result.applications)
      }
    } catch (error: unknown) {
      console.error('Failed to fetch applications:', error)
      toast.error('فشل تحميل طلبات الانضمام')
    } finally {
      setLoading(false)
    }
  }, [filter])

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
      fetchApplications()
    }
  }, [status, session, session?.user?.role, router, fetchApplications])

  const handleApprove = async (applicationId: string) => {
    if (!confirm('هل أنت متأكد من قبول هذا الطلب؟ سيتم إنشاء حساب للمهندس تلقائياً.')) {
      return
    }

    try {
      setProcessing(applicationId)
      const result = await apiClient.post<{ success: boolean; message?: string }>(`/admin/engineers/applications/${applicationId}/approve`)

      if (result.success) {
        toast.success('تم قبول الطلب وإنشاء حساب المهندس بنجاح')
        setSelectedApplication(null)
        fetchApplications()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل قبول الطلب'
      toast.error(errorMessage)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    if (!rejectNotes.trim()) {
      toast.error('يرجى إدخال سبب الرفض')
      return
    }

    if (!confirm('هل أنت متأكد من رفض هذا الطلب؟')) {
      return
    }

    try {
      setProcessing(applicationId)
      const result = await apiClient.post<{ success: boolean; message?: string }>(`/admin/engineers/applications/${applicationId}/reject`, {
        notes: rejectNotes
      })

      if (result.success) {
        toast.success('تم رفض الطلب')
        setSelectedApplication(null)
        setRejectNotes('')
        fetchApplications()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل رفض الطلب'
      toast.error(errorMessage)
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            معلق
          </span>
        )
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            مقبول
          </span>
        )
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            مرفوض
          </span>
        )
      default:
        return null
    }
  }

  const roleReady = status === 'authenticated' && session?.user?.role != null
  const isAdmin = session?.user?.role === 'ADMIN'
  if (status === 'loading' || !roleReady || !isAdmin || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  const pendingApplications = applications.filter(app => app.status === 'pending')
  const approvedApplications = applications.filter(app => app.status === 'approved')
  const rejectedApplications = applications.filter(app => app.status === 'rejected')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <BackButton href="/admin/engineers" label="العودة لإدارة المهندسين" />
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">طلبات انضمام المهندسين</h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            variant={filter === 'all' ? 'primary' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            الكل ({applications.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'primary' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            معلق ({pendingApplications.length})
          </Button>
          <Button
            variant={filter === 'approved' ? 'primary' : 'outline'}
            onClick={() => setFilter('approved')}
            size="sm"
          >
            مقبول ({approvedApplications.length})
          </Button>
          <Button
            variant={filter === 'rejected' ? 'primary' : 'outline'}
            onClick={() => setFilter('rejected')}
            size="sm"
          >
            مرفوض ({rejectedApplications.length})
          </Button>
        </div>

        {applications.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">لا توجد طلبات انضمام</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {application.name}
                      </h3>
                      {getStatusBadge(application.status)}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {application.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {application.phone}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      تاريخ التقديم: {formatDateTimeHijriMiladi(application.createdAt)}
                    </p>

                    {application.reviewedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        تاريخ المراجعة: {formatDateTimeHijriMiladi(application.reviewedAt)}
                      </p>
                    )}

                    {application.adminNotes && (
                      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300">
                        <strong>ملاحظات:</strong> {application.adminNotes}
                      </div>
                    )}
                  </div>

                  {application.status === 'pending' && (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setSelectedApplication(application)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 ml-2" />
                        عرض التفاصيل
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Application Detail Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  تفاصيل طلب الانضمام
                </h2>
                <button
                  onClick={() => {
                    setSelectedApplication(null)
                    setRejectNotes('')
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    الاسم
                  </label>
                  <p className="text-lg text-gray-900 dark:text-gray-100">{selectedApplication.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    البريد الإلكتروني
                  </label>
                  <p className="text-lg text-gray-900 dark:text-gray-100">{selectedApplication.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    رقم الجوال
                  </label>
                  <p className="text-lg text-gray-900 dark:text-gray-100">{selectedApplication.phone}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    تاريخ التقديم
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDateTimeHijriMiladi(selectedApplication.createdAt)}
                  </p>
                </div>
              </div>

              {selectedApplication.status === 'pending' && (
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
                      سبب الرفض (اختياري)
                    </label>
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="أدخل سبب الرفض إذا كنت ترفض الطلب..."
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(selectedApplication.id)}
                      disabled={processing === selectedApplication.id}
                      className="flex-1"
                    >
                      {processing === selectedApplication.id ? 'جاري المعالجة...' : (
                        <>
                          <CheckCircle className="w-4 h-4 ml-2" />
                          قبول الطلب
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedApplication.id)}
                      disabled={processing === selectedApplication.id}
                      variant="outline"
                      className="flex-1"
                    >
                      {processing === selectedApplication.id ? 'جاري المعالجة...' : (
                        <>
                          <XCircle className="w-4 h-4 ml-2" />
                          رفض الطلب
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
