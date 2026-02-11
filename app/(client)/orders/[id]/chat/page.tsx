'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrderChat, type ChatMessage } from '@/hooks/useOrderChat'
import Image from 'next/image'
import { Send, Download, User, MessageSquare, X, MapPin, Eye } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { apiClient } from '@/lib/api'
import { formatDateHijriMiladi, formatDateTimeHijriMiladi, isOrderExpired } from '@/lib/utils'
import { parseModificationPointMessage } from '@/lib/parseModificationPointMessage'
import { ModificationPointMessage } from '@/components/chat/ModificationPointMessage'
import toast from 'react-hot-toast'

interface Plan {
  id: string
  fileUrl: string | null
  fileType: string
  fileName?: string | null
  createdAt: string
}

interface Pin {
  x: number
  y: number
  color: string
  note: string
}

interface RevisionRequest {
  id: string
  planId: string | null
  pins: Pin[]
  status: string
  createdAt: string
  plan?: Plan | null
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useAuth()
  const orderId = params.id as string

  const chatEnabled = status === 'authenticated'
  const { messages, setMessages, loading, fetchError, fetchMessages } = useOrderChat(orderId, {
    enabled: chatEnabled,
  })

  const [plans, setPlans] = useState<Plan[]>([])
  const [revisions, setRevisions] = useState<RevisionRequest[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedRevision, setSelectedRevision] = useState<RevisionRequest | null>(null)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [orderInfo, setOrderInfo] = useState<{ deadline: string; status: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const revisionImageRef = useRef<HTMLImageElement>(null)
  const revisionContainerRef = useRef<HTMLDivElement>(null)

  const fetchPlans = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; plans: Plan[] }>(`/orders/${orderId}/plans`)
      if (result.success) {
        setPlans(result.plans)
      }
    } catch {
      // Silent fail
    }
  }, [orderId])

  const fetchRevisions = useCallback(async () => {
    try {
      const [revisionsResult, plansResult] = await Promise.all([
        apiClient.get<{ success: boolean; revisionRequests: RevisionRequest[] }>(`/revisions/${orderId}`),
        apiClient.get<{ success: boolean; plans: Plan[] }>(`/orders/${orderId}/plans`)
      ])
      
      if (revisionsResult.success && plansResult.success) {
        // Map revisions with their associated plans
        const revisionsWithPlans = revisionsResult.revisionRequests.map((revision) => {
          const plan = revision.planId 
            ? plansResult.plans.find(p => p.id === revision.planId) || null
            : null
          return { ...revision, plan }
        })
        setRevisions(revisionsWithPlans)
      }
    } catch {
      // Silent fail
    }
  }, [orderId])

  const fetchOrderInfo = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; order: { deadline: string; status: string; isExpired?: boolean } }>(`/orders/${orderId}`)
      if (result.success) {
        setOrderInfo({
          deadline: result.order.deadline,
          status: result.order.status
        })
      }
    } catch {
      // Silent fail
    }
  }, [orderId])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      fetchPlans()
      fetchRevisions()
      fetchOrderInfo()
    }
  }, [status, router, fetchPlans, fetchRevisions, fetchOrderInfo])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    if (messageDate.getTime() === today.getTime()) {
      return 'اليوم'
    } else if (messageDate.getTime() === today.getTime() - 86400000) {
      return 'أمس'
    } else {
      return formatDateHijriMiladi(date)
    }
  }

  const shouldShowDateSeparator = (currentIndex: number) => {
    if (currentIndex === 0) return true
    const currentMessage = messages[currentIndex]
    const previousMessage = messages[currentIndex - 1]
    const currentDate = new Date(currentMessage.createdAt).toDateString()
    const previousDate = new Date(previousMessage.createdAt).toDateString()
    return currentDate !== previousDate
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    // Check if order is expired
    if (orderInfo && isOrderExpired(orderInfo.deadline) && orderInfo.status === 'ARCHIVED') {
      toast.error('انتهى وقت الطلب. يمكنك شراء تمديد لإعادة تفعيل المحادثة')
      return
    }

    const text = newMessage.trim()
    setNewMessage('')
    setSending(true)

    // Optimistic: add temporary message (reverted on failure)
    const optimisticId = `opt-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      content: text,
      senderId: '',
      sender: { name: 'أنت', role: 'CLIENT' },
      createdAt: new Date().toISOString(),
      isRead: false,
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const result = await apiClient.post<{ success: boolean; message?: ChatMessage }>(`/messages/${orderId}`, {
        content: text,
      })

      if (result.success && result.message) {
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? result.message! : m)))
        fetchMessages(false)
      } else if (result.success) {
        fetchMessages(false)
      }
    } catch (error: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      const errorMessage = error instanceof Error ? error.message : 'فشل إرسال الرسالة'
      toast.error(errorMessage)
    } finally {
      setSending(false)
    }
  }

  const isArchived = orderInfo ? (isOrderExpired(orderInfo.deadline) && orderInfo.status === 'ARCHIVED') : false

  const openRevisionModal = (revision: RevisionRequest) => {
    setSelectedRevision(revision)
    setShowRevisionModal(true)
  }

  const closeRevisionModal = () => {
    setShowRevisionModal(false)
    setSelectedRevision(null)
  }

  if (status === 'loading' || (loading && messages.length === 0)) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex items-center justify-center">
        <Loading text="جاري التحميل..." />
      </div>
    )
  }

  const chatFallback = (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
      <p className="text-charcoal dark:text-cream font-medium mb-2">تعذر تحميل المحادثة</p>
      <p className="text-sm text-blue-gray dark:text-greige mb-4">حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.</p>
      <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-4 flex-1 flex flex-col max-w-4xl">
        {/* Back Button */}
        <div className="mb-4">
          <BackButton href={`/orders/${orderId}`} label="العودة لتفاصيل الطلب" />
        </div>

        <ErrorBoundary fallback={chatFallback}>
        {/* خطأ تحميل المحادثة + إعادة محاولة */}
        {fetchError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-red-700 dark:text-red-300">{fetchError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setLoading(true); fetchMessages(true) }}
            >
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* Plans Section */}
        {plans.length > 0 && (
          <Card className="mb-4 dark:bg-charcoal-800 dark:border-charcoal-600">
            <h3 className="font-semibold mb-3 text-charcoal dark:text-cream">المخططات المرفوعة</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {plans.filter((p) => p.fileUrl).map((plan) => (
                <div key={plan.id} className="border border-greige/30 dark:border-charcoal-600 rounded-lg p-3 bg-white dark:bg-charcoal-700">
                  {plan.fileType === 'image' && plan.fileUrl ? (
                    <Image
                      src={plan.fileUrl}
                      alt="Plan"
                      width={320}
                      height={128}
                      className="w-full h-32 object-cover rounded mb-2"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                    />
                  ) : plan.fileUrl ? (
                    <div className="w-full h-32 bg-greige/20 dark:bg-charcoal-600 rounded flex items-center justify-center mb-2">
                      <span className="text-blue-gray dark:text-greige">PDF</span>
                    </div>
                  ) : null}
                  {plan.fileUrl && (
                  <a
                    href={`/api/orders/${orderId}/plans/${plan.id}/download`}
                    download={plan.fileName?.trim() || (plan.fileType === 'pdf' ? 'plan.pdf' : 'plan.jpeg')}
                    className="flex items-center gap-2 text-rocky-blue dark:text-rocky-blue-300 hover:underline text-sm"
                  >
                    <Download className="w-4 h-4" />
                    تحميل
                  </a>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Revisions Section */}
        {revisions.length > 0 && (
          <Card className="mb-4 dark:bg-charcoal-800 dark:border-charcoal-600">
            <h3 className="font-semibold mb-3 text-charcoal dark:text-cream">التعديلات المطلوبة</h3>
            <div className="space-y-3">
              {revisions.map((revision) => {
                const planLabel = revision.plan?.fileName?.trim() || 'مخطط بدون اسم'
                const pins = revision.pins ?? []
                return (
                  <div
                    key={revision.id}
                    className="border border-greige/30 dark:border-charcoal-600 rounded-lg p-4 bg-greige/10 dark:bg-charcoal-700/50 hover:bg-greige/20 dark:hover:bg-charcoal-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <MapPin className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300 flex-shrink-0" />
                          <span className="font-medium text-charcoal dark:text-cream">
                            تعديل بتاريخ {formatDateHijriMiladi(revision.createdAt)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs border ${
                            revision.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' :
                            revision.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                            'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                          }`}>
                            {revision.status === 'completed' ? 'مكتمل' :
                             revision.status === 'in_progress' ? 'قيد التنفيذ' : 'معلق'}
                          </span>
                        </div>
                        <p className="text-sm text-blue-gray dark:text-greige mb-2">
                          المخطط: {planLabel}
                        </p>
                        <div className="space-y-2 mb-2">
                          {pins.length === 0 ? (
                            <p className="text-xs text-blue-gray dark:text-greige">لا توجد نقاط تعديل مسجلة</p>
                          ) : (
                            pins.map((pin, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-2 bg-white dark:bg-charcoal-700 rounded-lg border border-greige/30 dark:border-charcoal-600"
                                style={{ borderRightColor: pin.color, borderRightWidth: 3 }}
                              >
                                <div
                                  className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: pin.color }}
                                />
                                <p className="text-sm text-charcoal dark:text-cream break-words flex-1">
                                  {pin.note || '—'}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      {revision.plan && (
                        <Button
                          onClick={() => openRevisionModal(revision)}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 flex-shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                          عرض المخطط
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Messages */}
        <Card className="flex-1 flex flex-col dark:bg-charcoal-800 dark:border-charcoal-600">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-blue-gray dark:text-greige py-12">
                <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">لا توجد رسائل بعد</p>
                <p className="text-sm mt-2">ابدأ المحادثة مع المهندس</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message.id}>
                  {/* Date Separator */}
                  {shouldShowDateSeparator(index) && (
                    <div className="flex items-center justify-center my-6">
                      <div className="flex items-center gap-2 px-4 py-1 bg-greige/20 dark:bg-charcoal-700 rounded-full">
                        <span className="text-xs font-medium text-blue-gray dark:text-greige">
                          {formatMessageDate(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Message */}
                  <div
                    className={`flex items-start gap-3 ${
                      message.sender.role === 'CLIENT' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        message.sender.role === 'CLIENT'
                          ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream'
                          : 'bg-greige dark:bg-charcoal-600 text-charcoal dark:text-cream'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>

                    {/* Message Content */}
                    <div
                      className={`flex flex-col ${
                        message.sender.role === 'CLIENT' ? 'items-end' : 'items-start'
                      } max-w-[75%] md:max-w-md`}
                    >
                      {/* Sender Name */}
                      <p
                        className={`text-sm font-semibold mb-1 px-1 ${
                          message.sender.role === 'CLIENT'
                            ? 'text-rocky-blue dark:text-rocky-blue-300'
                            : 'text-charcoal dark:text-cream'
                        }`}
                      >
                        {message.sender.role === 'CLIENT' ? 'أنت' : message.sender.name}
                      </p>

                      {/* Message Bubble or Modification Point Card */}
                      {(() => {
                        const parsed = parseModificationPointMessage(message.content)
                        return parsed ? (
                          <ModificationPointMessage
                            data={parsed}
                            isFromClient={message.sender.role === 'CLIENT'}
                          />
                        ) : (
                        <div
                          className={`px-5 py-3 rounded-2xl shadow-sm ${
                            message.sender.role === 'CLIENT'
                              ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream rounded-tr-sm'
                              : 'bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream border border-greige/30 dark:border-charcoal-600 rounded-tl-sm'
                          }`}
                        >
                          <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                        )
                      })()}

                      {/* Time */}
                      <p
                        className={`text-xs mt-1 px-1 ${
                          message.sender.role === 'CLIENT'
                            ? 'text-blue-gray dark:text-greige'
                            : 'text-blue-gray dark:text-greige'
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-greige/30 dark:border-charcoal-600 bg-white dark:bg-charcoal-800 p-4 md:p-5">
            {isArchived && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                  <strong>ملاحظة:</strong> انتهى وقت الطلب. المحادثة مغلقة. يمكنك شراء تمديد لإعادة تفعيلها.
                </p>
                <Button
                  onClick={async () => {
                    if (confirm('هل تريد شراء تمديد لمدة يوم واحد (100 ريال)؟ سيتم إضافة تعديل واحد وإعادة تفعيل الطلب.')) {
                      try {
                        const result = await apiClient.post<{ success: boolean; message: string }>(`/orders/${orderId}/buy-extension`)
                        if (result.success) {
                          toast.success(result.message)
                          fetchOrderInfo()
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
              </div>
            )}
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isArchived && sendMessage()}
                placeholder={isArchived ? "المحادثة مغلقة - انتهى وقت الطلب" : "اكتب رسالتك هنا..."}
                disabled={isArchived}
                className="flex-1 px-5 py-3 text-base border-2 border-greige/30 dark:border-charcoal-600 rounded-xl focus:ring-2 focus:ring-rocky-blue focus:border-rocky-blue outline-none transition-all bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream placeholder:text-blue-gray dark:placeholder:text-greige disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim() || isArchived}
                className="px-6 py-3 text-base"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline mr-2">إرسال</span>
              </Button>
            </div>
          </div>
        </Card>
        </ErrorBoundary>
      </main>

      {/* Revision Modal */}
      {showRevisionModal && selectedRevision && selectedRevision.plan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-charcoal-800 rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col border border-greige/30 dark:border-charcoal-600">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-greige/30 dark:border-charcoal-600">
              <h2 className="text-xl font-bold text-charcoal dark:text-cream">
                عرض التعديلات على المخطط
              </h2>
              <button
                onClick={closeRevisionModal}
                className="p-2 hover:bg-greige/20 dark:hover:bg-charcoal-700 rounded-full transition-colors text-charcoal dark:text-cream"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4">
                <p className="text-sm text-blue-gray dark:text-greige mb-2">
                  <strong>تاريخ التعديل:</strong> {formatDateTimeHijriMiladi(selectedRevision.createdAt)}
                </p>
                <p className="text-sm text-blue-gray dark:text-greige">
                  <strong>عدد نقاط التعديل:</strong> {selectedRevision.pins.length}
                </p>
              </div>

              {/* Plan with Pins */}
              <div className="relative border border-greige/30 dark:border-charcoal-600 rounded-lg overflow-hidden bg-greige/20 dark:bg-charcoal-700">
                {!selectedRevision.plan.fileUrl ? (
                  <div className="p-8 text-center text-amber-700 dark:text-amber-300">
                    <p>تم حذف الملف من الأرشيف.</p>
                  </div>
                ) : selectedRevision.plan.fileType === 'image' ? (
                  <div className="relative w-full" ref={revisionContainerRef}>
                    <Image
                      ref={revisionImageRef}
                      src={selectedRevision.plan.fileUrl}
                      alt="Plan with revisions"
                      width={1200}
                      height={800}
                      className="w-full h-auto"
                      unoptimized
                    />
                    {selectedRevision.pins.map((pin, index) => (
                      <div
                        key={index}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{
                          left: `${pin.x}%`,
                          top: `${pin.y}%`,
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white dark:border-charcoal-800 shadow-lg transition-transform group-hover:scale-125"
                          style={{ backgroundColor: pin.color }}
                        />
                        {/* Pin Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-charcoal dark:bg-charcoal-800 text-cream text-sm rounded-lg px-3 py-2 max-w-xs shadow-xl border border-greige/30">
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: pin.color }}
                              />
                              <span className="font-semibold">نقطة تعديل {index + 1}</span>
                            </div>
                            <p className="text-xs whitespace-pre-wrap">{pin.note}</p>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-charcoal dark:border-t-charcoal-800" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-blue-gray dark:text-greige mb-4">المخطط بصيغة PDF</p>
                    <a
                      href={`/api/orders/${orderId}/plans/${selectedRevision.plan.id}/download`}
                      download={selectedRevision.plan.fileName?.trim() || (selectedRevision.plan.fileType === 'pdf' ? 'plan.pdf' : 'plan.jpeg')}
                      className="inline-flex items-center gap-2 text-rocky-blue dark:text-rocky-blue-300 hover:underline"
                    >
                      <Download className="w-5 h-5" />
                      تحميل الملف
                    </a>
                  </div>
                )}
              </div>

              {/* Pins List */}
              <div className="mt-6">
                <h3 className="font-semibold mb-3 text-charcoal dark:text-cream">تفاصيل نقاط التعديل:</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedRevision.pins.map((pin, index) => (
                    <div
                      key={index}
                      className="border border-greige/30 dark:border-charcoal-600 rounded-lg p-4 bg-white dark:bg-charcoal-700"
                      style={{ borderLeftColor: pin.color, borderLeftWidth: '4px' }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: pin.color }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-charcoal dark:text-cream mb-1">
                            نقطة تعديل {index + 1}
                          </p>
                          <p className="text-sm text-charcoal dark:text-cream whitespace-pre-wrap">
                            {pin.note}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-greige/30 dark:border-charcoal-600 flex justify-end">
              <Button onClick={closeRevisionModal}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
