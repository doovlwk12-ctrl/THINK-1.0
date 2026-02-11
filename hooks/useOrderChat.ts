'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
const MAX_CONSECUTIVE_FAILURES = 3
const FETCH_ERROR_SERVER = 'تعذر الاتصال بالخادم. تحقق من الاتصال وأعد المحاولة.'

export function useOrderChat(
  orderId: string,
  options: { enabled: boolean; pollIntervalMs?: number } = { enabled: true }
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [pollingStopped, setPollingStopped] = useState(false)
  const consecutiveFailuresRef = useRef(0)
  const { enabled, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = options

  const fetchMessages = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial) {
          setFetchError(null)
          consecutiveFailuresRef.current = 0
          setPollingStopped(false)
        }
        const result = await apiClient.get<{ success: boolean; messages: ChatMessage[] }>(
          `/messages/${orderId}`
        )
        if (result.success) {
          setMessages(Array.isArray(result.messages) ? result.messages : [])
          consecutiveFailuresRef.current = 0
        }
      } catch (e) {
        const err = e as Error & { status?: number }
        const isServerError = err.status === 503 || err.status === 500
        const msg = isServerError
          ? FETCH_ERROR_SERVER
          : e instanceof Error
            ? e.message
            : 'فشل تحميل المحادثة'
        setFetchError(msg)
        if (isInitial || isServerError) {
          setPollingStopped(true)
        }
        consecutiveFailuresRef.current += 1
        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          setPollingStopped(true)
        }
      } finally {
        setLoading(false)
      }
    },
    [orderId]
  )

  useEffect(() => {
    if (!enabled || pollingStopped) return
    fetchMessages(true)
    const interval = setInterval(() => {
      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) return
      fetchMessages(false)
    }, pollIntervalMs)
    return () => clearInterval(interval)
  }, [enabled, orderId, pollIntervalMs, pollingStopped, fetchMessages])

  return { messages, setMessages, loading, setLoading, fetchError, fetchMessages }
}
