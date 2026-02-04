'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import Link from 'next/link'
import { 
  ArrowRight, 
  Clock, 
  User, 
  Package, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Edit,
  Download,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send
} from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { formatDateTimeHijriMiladi } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Pin {
  x: number
  y: number
  color: string
  note: string
}

interface Plan {
  id: string
  fileUrl: string
  fileType: string
  fileName?: string | null
  createdAt: string
}

interface RevisionRequest {
  id: string
  orderId: string
  planId: string | null
  pins: Pin[]
  status: string
  createdAt: string
  updatedAt: string
  order: {
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
    plans: Plan[]
  }
}

interface RevisionListItem {
  id: string
  orderId: string
  planId: string | null
  pins: Pin[]
  status: string
  createdAt: string
  updatedAt: string
}

export default function EngineerRevisionPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useAuth()
  const orderId = params.id as string
  const revisionId = params.revisionId as string
  
  const [revision, setRevision] = useState<RevisionRequest | null>(null)
  const [allRevisions, setAllRevisions] = useState<RevisionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPin, setSelectedPin] = useState<number | null>(null)
  const [showRevisionSelector, setShowRevisionSelector] = useState(false)
  const [sendingToChatPinIndex, setSendingToChatPinIndex] = useState<number | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const buildPinMessageText = useCallback((pin: Pin, pinIndex: number) => {
    return `📍 نقطة التعديل #${pinIndex + 1}

الموقع: (${pin.x.toFixed(1)}%, ${pin.y.toFixed(1)}%)
الملاحظة: ${pin.note || 'بدون ملاحظة'}

هل يمكنك توضيح هذه النقطة أكثر؟`
  }, [])

  // Copy pin info to chat (user can edit before sending)
  const copyPinToChat = useCallback((pin: Pin, pinIndex: number) => {
    const pinInfo = buildPinMessageText(pin, pinIndex)
    sessionStorage.setItem('pendingChatMessage', pinInfo)
    sessionStorage.setItem('pendingChatPinInfo', JSON.stringify({
      pinIndex: pinIndex + 1,
      x: pin.x,
      y: pin.y,
      note: pin.note,
      color: pin.color
    }))
    router.push(`/engineer/orders/${orderId}/chat?pin=${pinIndex + 1}`)
    toast.success('تم نسخ معلومات النقطة إلى المحادثة')
  }, [orderId, router, buildPinMessageText])

  // Send pin info directly to chat then navigate
  const sendPinToChat = useCallback(async (pin: Pin, pinIndex: number) => {
    setSendingToChatPinIndex(pinIndex)
    try {
      const content = buildPinMessageText(pin, pinIndex)
      const result = await apiClient.post<{ success: boolean }>(`/messages/${orderId}`, {
        content,
      })
      if (result.success) {
        toast.success('تم إرسال نقطة التعديل إلى المحادثة')
        router.push(`/engineer/orders/${orderId}/chat?pin=${pinIndex + 1}`)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل إرسال الرسالة'
      toast.error(msg)
    } finally {
      setSendingToChatPinIndex(null)
    }
  }, [orderId, router, buildPinMessageText])

  const fetchRevision = useCallback(async () => {
    try {
      const [revisionResult, revisionsResult] = await Promise.all([
        apiClient.get<{ success: boolean; revision: RevisionRequest }>(
          `/revisions/detail/${revisionId}`
        ),
        apiClient.get<{ success: boolean; revisionRequests: RevisionListItem[] }>(
          `/revisions/${orderId}`
        )
      ])
      
      if (revisionResult.success) {
        setRevision(revisionResult.revision)
      }
      
      if (revisionsResult.success) {
        // Sort by creation date (oldest first) to determine revision number
        const sorted = [...revisionsResult.revisionRequests].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setAllRevisions(sorted)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تحميل بيانات التعديل'
      toast.error(errorMessage)
      router.back()
    } finally {
      setLoading(false)
    }
  }, [revisionId, orderId, router])

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
      fetchRevision()
    }
  }, [status, session, router, fetchRevision])

  // Close selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.relative')) {
        setShowRevisionSelector(false)
      }
    }

    if (showRevisionSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showRevisionSelector])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-2 border-yellow-200 dark:border-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-800'
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-2 border-green-200 dark:border-green-800'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-2 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'معلق'
      case 'in_progress':
        return 'قيد التنفيذ'
      case 'completed':
        return 'مكتمل'
      case 'rejected':
        return 'مرفوض'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5" />
      case 'rejected':
        return <XCircle className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  // Get revision number (1-based, oldest is 1)
  const getRevisionNumber = () => {
    const index = allRevisions.findIndex(r => r.id === revisionId)
    return index !== -1 ? index + 1 : null
  }

  // Get revision number text in Arabic
  const getRevisionNumberText = () => {
    const num = getRevisionNumber()
    if (!num) return ''
    
    const arabicNumbers: { [key: number]: string } = {
      1: 'الأول',
      2: 'الثاني',
      3: 'الثالث',
      4: 'الرابع',
      5: 'الخامس',
      6: 'السادس',
      7: 'السابع',
      8: 'الثامن',
      9: 'التاسع',
      10: 'العاشر'
    }
    
    return arabicNumbers[num] || `التعديل رقم ${num}`
  }

  // Get current revision index
  const currentRevisionIndex = allRevisions.findIndex(r => r.id === revisionId)
  const hasPrevious = currentRevisionIndex > 0
  const hasNext = currentRevisionIndex < allRevisions.length - 1

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loading text="جاري تحميل بيانات التعديل..." />
        </div>
      </div>
    )
  }

  if (!revision) {
    return null
  }

  const plan = revision.order.plans.find(p => p.id === revision.planId) || revision.order.plans[0]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href={`/engineer/orders/${orderId}`} />
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  التعديل {getRevisionNumberText()}
                </h1>
                {allRevisions.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowRevisionSelector(!showRevisionSelector)}
                      className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        اختر تعديل آخر
                      </span>
                      {showRevisionSelector ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {showRevisionSelector && (
                      <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 min-w-[250px]">
                        <div className="p-2 max-h-64 overflow-y-auto">
                          {allRevisions.map((rev, index) => (
                            <Link
                              key={rev.id}
                              href={`/engineer/orders/${orderId}/revision/${rev.id}`}
                              className={`block px-4 py-3 rounded-lg mb-1 transition-colors ${
                                rev.id === revisionId
                                  ? 'bg-primary-50 dark:bg-primary-900/30 border-2 border-primary-500 dark:border-primary-400'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                              }`}
                              onClick={() => setShowRevisionSelector(false)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                                    التعديل {index === 0 ? 'الأول' : index === 1 ? 'الثاني' : index === 2 ? 'الثالث' : `رقم ${index + 1}`}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDateTimeHijriMiladi(rev.createdAt)}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  rev.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                                  rev.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' :
                                  rev.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                                }`}>
                                  {getStatusText(rev.status)}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                طلب #{revision.order.orderNumber}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 ${getStatusColor(revision.status)}`}>
              {getStatusIcon(revision.status)}
              <span className="font-semibold">{getStatusText(revision.status)}</span>
            </div>
          </div>

          {/* Navigation between revisions */}
          {allRevisions.length > 1 && (
            <div className="flex items-center gap-3 mb-4">
              {hasPrevious && (
                <Link
                  href={`/engineer/orders/${orderId}/revision/${allRevisions[currentRevisionIndex - 1].id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span className="text-sm font-medium">التعديل السابق</span>
                </Link>
              )}
              {hasNext && (
                <Link
                  href={`/engineer/orders/${orderId}/revision/${allRevisions[currentRevisionIndex + 1].id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors ml-auto text-gray-700 dark:text-gray-300"
                >
                  <span className="text-sm font-medium">التعديل التالي</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                تاريخ الطلب: {formatDateTimeHijriMiladi(revision.createdAt)}
              </span>
            </div>
            {revision.updatedAt !== revision.createdAt && (
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                <span>
                  آخر تحديث: {formatDateTimeHijriMiladi(revision.updatedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Plan with Pins */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Display */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Package className="w-5 h-5" />
                  المخطط المطلوب تعديله{plan ? `: ${plan.fileName?.trim() || 'مخطط بدون اسم'}` : ''}
                </h2>
                {plan && (
                  <a
                    href={`/api/orders/${revision.orderId}/plans/${plan.id}/download`}
                    download={plan.fileName?.trim() || (plan.fileType === 'pdf' ? 'plan.pdf' : 'plan.jpeg')}
                    className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    <Download className="w-4 h-4" />
                    تحميل المخطط
                  </a>
                )}
              </div>

              {plan ? (
                <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  {plan.fileType === 'image' ? (
                    <div className="relative w-full">
                      <Image
                        ref={imageRef}
                        src={plan.fileUrl}
                        alt="Plan"
                        width={1200}
                        height={800}
                        className="w-full h-auto"
                        priority
                        quality={90}
                      />
                      
                      {/* Render Pins */}
                      {revision.pins.map((pin, index) => (
                        <div
                          key={index}
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                            selectedPin === index ? 'z-20 scale-125' : 'z-10 hover:scale-110'
                          }`}
                          style={{
                            left: `${pin.x}%`,
                            top: `${pin.y}%`,
                          }}
                          onClick={() => setSelectedPin(selectedPin === index ? null : index)}
                        >
                          <div
                            className="w-8 h-8 rounded-full border-4 border-white shadow-lg"
                            style={{ backgroundColor: pin.color }}
                          />
                          {selectedPin === index && (
                            <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 min-w-[250px] max-w-[350px] border-2 z-30"
                                 style={{ borderColor: pin.color }}
                                 onClick={(e) => e.stopPropagation()}>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow"
                                  style={{ backgroundColor: pin.color }}
                                />
                                نقطة التعديل #{index + 1}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{pin.note}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                الموقع: ({pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%)
                              </p>
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    sendPinToChat(pin, index)
                                  }}
                                  disabled={sendingToChatPinIndex === index}
                                  className="w-full"
                                >
                                  <Send className="w-4 h-4 ml-2" />
                                  {sendingToChatPinIndex === index ? 'جاري الإرسال...' : 'إرسال الآن'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyPinToChat(pin, index)
                                  }}
                                  className="w-full"
                                >
                                  <MessageSquare className="w-4 h-4 ml-2" />
                                  نسخ وفتح المحادثة
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 rounded flex flex-col items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400 text-lg mb-4">ملف PDF</span>
                      <a
                        href={`/api/orders/${revision.orderId}/plans/${plan.id}/download`}
                        download={plan.fileName?.trim() || (plan.fileType === 'pdf' ? 'plan.pdf' : 'plan.jpeg')}
                        className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        <Download className="w-5 h-5" />
                        <span>تحميل الملف</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>المخطط غير متوفر</p>
                </div>
              )}
            </Card>

            {/* Pins List */}
            <Card>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <MapPin className="w-5 h-5" />
                نقاط التعديل ({revision.pins.length})
              </h2>
              <div className="space-y-3">
                {revision.pins.map((pin, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPin === index
                        ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div 
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setSelectedPin(selectedPin === index ? null : index)}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 border-2 border-white dark:border-gray-800 shadow"
                        style={{ backgroundColor: pin.color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            نقطة التعديل #{index + 1}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%)
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{pin.note}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          sendPinToChat(pin, index)
                        }}
                        disabled={sendingToChatPinIndex === index}
                        className="w-full"
                      >
                        <Send className="w-4 h-4 ml-2" />
                        {sendingToChatPinIndex === index ? 'جاري الإرسال...' : 'إرسال الآن'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyPinToChat(pin, index)
                        }}
                        className="w-full"
                      >
                        <MessageSquare className="w-4 h-4 ml-2" />
                        نسخ وفتح المحادثة
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Info */}
            <Card>
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Package className="w-5 h-5" />
                معلومات الطلب
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">رقم الطلب</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{revision.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">الباقة</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{(revision.order as { packageForDisplay?: { nameAr: string } }).packageForDisplay?.nameAr ?? revision.order.package?.nameAr}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">السعر</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{(revision.order as { packageForDisplay?: { price: number } }).packageForDisplay?.price ?? revision.order.package?.price} ريال</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">حالة الطلب</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${
                    revision.order.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' :
                    revision.order.status === 'IN_PROGRESS' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                  }`}>
                    {revision.order.status === 'COMPLETED' ? 'مكتمل' :
                     revision.order.status === 'IN_PROGRESS' ? 'قيد التنفيذ' :
                     'في الانتظار'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Client Info */}
            <Card>
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <User className="w-5 h-5" />
                معلومات العميل
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">الاسم</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{revision.order.client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">البريد الإلكتروني</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{revision.order.client.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">رقم الجوال</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{revision.order.client.phone}</p>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">الإجراءات</h3>
              <div className="space-y-3">
                <Link href={`/engineer/orders/${orderId}`} className="block">
                  <Button variant="outline" className="w-full">
                    <ArrowRight className="w-4 h-4" />
                    العودة إلى الطلب
                  </Button>
                </Link>
                <Link href={`/engineer/orders/${orderId}/chat`} className="block">
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="w-4 h-4" />
                    فتح المحادثة
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
