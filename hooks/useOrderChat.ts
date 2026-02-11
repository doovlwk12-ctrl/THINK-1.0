'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

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

const DEFAULT_POLL_INTERVAL_MS = 3000
const FETCH_ERROR_503 = 'تعذر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.'

export function useOrderChat(
  orderId: string,
  options: { enabled: boolean; pollIntervalMs?: number } = { enabled: true }
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { enabled, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = options

  const fetchMessages = useCallback(
    async (isInitial = false) => {
      try {
        setFetchError(null)
        const result = await apiClient.get<{ success: boolean; messages: ChatMessage[] }>(
          `/messages/${orderId}`
        )
        if (result.success) {
          setMessages(result.messages)
        }
      } catch (e) {
        const err = e as Error & { status?: number }
        const msg =
          err.status === 503
            ? FETCH_ERROR_503
            : e instanceof Error
              ? e.message
              : 'فشل تحميل المحادثة'
        if (isInitial) setFetchError(msg)
      } finally {
        setLoading(false)
      }
    },
    [orderId]
  )

  useEffect(() => {
    if (!enabled) return
    fetchMessages(true)
    const interval = setInterval(() => fetchMessages(false), pollIntervalMs)
    return () => clearInterval(interval)
  }, [enabled, orderId, pollIntervalMs, fetchMessages])

  return { messages, setMessages, loading, fetchError, fetchMessages }
}
