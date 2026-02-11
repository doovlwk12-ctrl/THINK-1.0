'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

export interface ChatMessage {
  id: string
  content: string
  senderId: string
  sender: {
    name: string
    role: string
  }
  createdAt: string
  isRead?: boolean
}

const POLL_INTERVAL_MS = 20000
const RETRY_AFTER_MS = 60_000
const FETCH_ERROR_SERVER = 'تعذر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.'

/** مسارات بديلة للمحادثة (تجنب 500/405 في /api/messages). */
const CHAT_GET = '/chat/messages'
const CHAT_SEND = '/chat/send'

/** دمج مصفوفتي رسائل حسب id وترتيب حسب createdAt لتفادي تكرار من الـ Polling مع Realtime. */
function mergeMessagesById(
  current: ChatMessage[],
  fromServer: ChatMessage[]
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const m of current) byId.set(m.id, m)
  for (const m of fromServer) if (m?.id) byId.set(m.id, m)
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

export function useOrderChat(
  orderId: string,
  options: { enabled: boolean; pollIntervalMs?: number } = { enabled: true }
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [pollingStopped, setPollingStopped] = useState(false)
  const [fetchingMore, setFetchingMore] = useState(false)
  const retryAfterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const { enabled, pollIntervalMs = POLL_INTERVAL_MS } = options

  const fetchMessages = useCallback(
    async (isInitial = false) => {
      if (!isInitial) setFetchingMore(true)
      try {
        if (isInitial) {
          setFetchError(null)
          setPollingStopped(false)
          if (retryAfterTimeoutRef.current) {
            clearTimeout(retryAfterTimeoutRef.current)
            retryAfterTimeoutRef.current = null
          }
        }
        const result = await apiClient.get<{ success: boolean; messages: ChatMessage[] }>(
          `${CHAT_GET}?orderId=${encodeURIComponent(orderId)}`
        )
        if (result.success && Array.isArray(result.messages)) {
          setMessages((prev) =>
            isInitial ? result.messages! : mergeMessagesById(prev, result.messages!)
          )
        }
      } catch (e) {
        const err = e as Error & { status?: number }
        const isServerError = err.status === 503 || err.status === 500
        setFetchError(
          isServerError ? FETCH_ERROR_SERVER : e instanceof Error ? e.message : 'فشل تحميل المحادثة'
        )
        if (isInitial || isServerError) {
          setPollingStopped(true)
          if (isServerError) {
            if (retryAfterTimeoutRef.current) clearTimeout(retryAfterTimeoutRef.current)
            retryAfterTimeoutRef.current = setTimeout(() => {
              setPollingStopped(false)
              retryAfterTimeoutRef.current = null
            }, RETRY_AFTER_MS)
          }
        }
      } finally {
        setLoading(false)
        setFetchingMore(false)
      }
    },
    [orderId]
  )

  const broadcastMessage = useCallback(
    (message: ChatMessage) => {
      const supabase = createClient()
      if (!supabase) return
      const ch = channelRef.current
      if (ch) {
        ch.send({ type: 'broadcast', event: 'message', payload: message })
        return
      }
      const tempCh = supabase.channel(`order:${orderId}`)
      tempCh.send({ type: 'broadcast', event: 'message', payload: message })
      supabase.removeChannel(tempCh)
    },
    [orderId]
  )

  useEffect(() => {
    if (!enabled || !orderId) return
    const supabase = createClient()
    if (!supabase) return
    const channel = supabase.channel(`order:${orderId}`)
    channelRef.current = channel
    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = payload as ChatMessage
        if (msg?.id) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        }
      })
      .subscribe()

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [enabled, orderId])

  useEffect(() => {
    if (!enabled || pollingStopped) return
    fetchMessages(true)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      fetchMessages(false)
    }, pollIntervalMs)
    return () => {
      clearInterval(interval)
      if (retryAfterTimeoutRef.current) {
        clearTimeout(retryAfterTimeoutRef.current)
        retryAfterTimeoutRef.current = null
      }
    }
  }, [enabled, orderId, pollIntervalMs, pollingStopped, fetchMessages])

  return { messages, setMessages, loading, setLoading, fetchError, fetchMessages, fetchingMore, broadcastMessage }
}
