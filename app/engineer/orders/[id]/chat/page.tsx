'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Send } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Card } from '@/components/shared/Card'
import { Loading } from '@/components/shared/Loading'
import { Header } from '@/components/layout/Header'
import { BackButton } from '@/components/shared/BackButton'
import { apiClient } from '@/lib/api'
import { parseModificationPointMessage } from '@/lib/parseModificationPointMessage'
import { ModificationPointMessage } from '@/components/chat/ModificationPointMessage'
import toast from 'react-hot-toast'

interface Message {
  id: string
  content: string
  senderId: string
  sender: {
    name: string
    role: string
  }
  createdAt: string
}

export default function EngineerChatPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useAuth()
  const orderId = params.id as string
  
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const result = await apiClient.get<{ success: boolean; messages: Message[] }>(`/messages/${orderId}`)
      if (result.success) {
        setMessages(result.messages)
      }
    } catch {
      // Silent fail for polling
    } finally {
      setLoading(false)
    }
  }, [orderId])

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
      fetchMessages()
      
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => {
        fetchMessages()
      }, 5000)
      
      return () => clearInterval(interval)
    }
  }, [status, session, router, fetchMessages])

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
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const result = await apiClient.post<{ success: boolean }>('/messages/send', {
        orderId,
        content: newMessage,
      })

      if (result.success) {
        setNewMessage('')
        fetchMessages()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل إرسال الرسالة'
      toast.error(errorMessage)
    } finally {
      setSending(false)
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
    <div className="min-h-screen bg-cream dark:bg-charcoal-900 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-4 flex-1 flex flex-col max-w-4xl">
        <div className="mb-4">
          <BackButton href={`/engineer/orders/${orderId}`} label="العودة لتفاصيل الطلب" />
        </div>
        <Card className="flex-1 flex flex-col dark:bg-charcoal-800 dark:border-charcoal-600">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
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
            ))}
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
      </main>
    </div>
  )
}
