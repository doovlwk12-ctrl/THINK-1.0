'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrderChat, type ChatMessage } from '@/hooks/useOrderChat'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { apiClient } from '@/lib/api'
import { parseModificationPointMessage } from '@/lib/parseModificationPointMessage'
import { ModificationPointMessage } from '@/components/chat/ModificationPointMessage'
import toast from 'react-hot-toast'

const engineerOrAdmin = (role: string | undefined) =>
  role === 'ENGINEER' || role === 'ADMIN'

export default function EngineerChatPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useAuth()
  const orderId = params.id as string

  const chatEnabled = status === 'authenticated' && engineerOrAdmin(session?.user?.role)
  const { messages, setMessages, loading, setLoading, fetchError, fetchMessages, fetchingMore, broadcastMessage } =
    useOrderChat(orderId, { enabled: chatEnabled })

  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && !engineerOrAdmin(session?.user?.role)) {
      router.push('/dashboard')
      return
    }
  }, [status, session?.user?.role, router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load pending message from sessionStorage (when coming from revision page)
  useEffect(() => {
    const pendingMessage = sessionStorage.getItem('pendingChatMessage')
    
    if (pendingMessage) {
      setNewMessage(pendingMessage)
      // Clear sessionStorage after loading
      sessionStorage.removeItem('pendingChatMessage')
      sessionStorage.removeItem('pendingChatPinInfo')
      
      // Scroll to input and focus
      setTimeout(() => {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement
        input?.focus()
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    const text = newMessage.trim()
    setNewMessage('')
    setSending(true)

    // Optimistic: add temporary message (reverted on failure)
    const optimisticId = `opt-${Date.now()}`
    const optimisticMessage = {
      id: optimisticId,
      content: text,
      senderId: '',
      sender: { name: session?.user?.name ?? 'المهندس', role: 'ENGINEER' },
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    try {
      const result = await apiClient.post<{ success: boolean; message?: ChatMessage }>('/chat/send', {
        orderId,
        content: text,
      })

      if (result.success && result.message) {
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? result.message! : m)))
        broadcastMessage(result.message)
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
        <div className="mb-4">
          <BackButton href={`/engineer/orders/${orderId}`} label="العودة لتفاصيل الطلب" />
        </div>
        <ErrorBoundary fallback={chatFallback}>
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
        <Card className="flex-1 flex flex-col dark:bg-charcoal-800 dark:border-charcoal-600 relative">
          {fetchingMore && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rocky-blue/90 dark:bg-rocky-blue-600/90 text-cream text-xs shadow-md">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري التحقق من رسائل جديدة...</span>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && messages.length === 0 && !fetchError ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] py-12">
                <Loading />
                <p className="text-sm mt-3 text-blue-gray dark:text-greige">جاري تحميل المحادثة...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] text-blue-gray dark:text-greige py-12">
                <p className="text-lg">لا توجد رسائل بعد</p>
                <p className="text-sm mt-2">ابدأ المحادثة مع العميل</p>
              </div>
            ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender.role === 'ENGINEER' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-xs lg:max-w-md">
                  <p className="text-sm font-semibold mb-1">{message.sender.name}</p>
                  {(() => {
                    const parsed = parseModificationPointMessage(message.content)
                    return parsed ? (
                      <ModificationPointMessage
                        data={parsed}
                        isFromClient={message.sender.role !== 'ENGINEER'}
                      />
                    ) : (
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.sender.role === 'ENGINEER'
                          ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream'
                          : 'bg-greige/20 dark:bg-charcoal-700 text-charcoal dark:text-cream'
                      }`}
                    >
                      <p>{message.content}</p>
                    </div>
                    )
                  })()}
                  <p className={`text-xs mt-1 ${message.sender.role === 'ENGINEER' ? 'opacity-75' : 'opacity-60 dark:opacity-70'}`}>
                    {new Date(message.createdAt).toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-greige/30 dark:border-charcoal-600 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="اكتب رسالتك..."
                className="flex-1 px-4 py-2 border border-greige/30 dark:border-charcoal-600 rounded-lg bg-white dark:bg-charcoal-700 text-charcoal dark:text-cream placeholder-blue-gray dark:placeholder-greige focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:border-transparent"
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !newMessage.trim()}
              >
                <Send className="w-4 h-4" />
                إرسال
              </Button>
            </div>
          </div>
        </Card>
        </ErrorBoundary>
      </main>
    </div>
  )
}
